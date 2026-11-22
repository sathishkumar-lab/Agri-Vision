"""Evaluate only manifest test records and report per-class segmentation/damage metrics."""
from __future__ import annotations
import argparse, json
from pathlib import Path
import numpy as np
import tensorflow as tf
from PIL import Image
from ..config import CLASS_NAMES
from ..data import dataset, load_manifest


def metrics(conf):
    total = conf.sum(); result = {"pixel_accuracy": float(np.trace(conf) / total) if total else None, "classes": {}}
    ious=[]; dices=[]; precisions=[]; recalls=[]; f1s=[]
    for k, name in CLASS_NAMES.items():
        tp=conf[k,k]; fp=conf[:,k].sum()-tp; fn=conf[k,:].sum()-tp
        precision=tp/(tp+fp) if tp+fp else 0.; recall=tp/(tp+fn) if tp+fn else 0.; iou=tp/(tp+fp+fn) if tp+fp+fn else 0.; dice=2*tp/(2*tp+fp+fn) if 2*tp+fp+fn else 0.
        result["classes"][name]={"precision":float(precision),"recall":float(recall),"f1":float(dice),"iou":float(iou),"dice":float(dice),"support_pixels":int(conf[k,:].sum())}
        ious.append(iou); dices.append(dice); precisions.append(precision); recalls.append(recall); f1s.append(dice)
    result.update({"precision_macro":float(np.mean(precisions)),"recall_macro":float(np.mean(recalls)),"f1_macro":float(np.mean(f1s)),"mean_iou":float(np.mean(ious)),"mean_dice":float(np.mean(dices))})
    return result


def main():
    p=argparse.ArgumentParser()
    p.add_argument("--manifest",required=True)
    p.add_argument("--model",required=True)
    p.add_argument("--output",required=True)
    p.add_argument("--split",default="test",choices=["train","validation","test"])
    p.add_argument("--threshold",type=float,default=None,help="Custom threshold for damage class (0..1)")
    p.add_argument("--batch-size",type=int,default=4)
    a=p.parse_args()

    manifest=load_manifest(a.manifest)
    records=[e for e in manifest["entries"] if e["split"]==a.split]
    config_path=Path(a.model).parent/"config.json"
    config=json.loads(config_path.read_text())
    ds=dataset(a.manifest,a.split,a.batch_size,tuple(config["input_size"]))
    model=tf.keras.models.load_model(a.model,compile=False)

    conf=np.zeros((3,3),dtype=np.int64)
    damage_errors=[]
    visuals=Path(a.output)/"visuals"
    visuals.mkdir(parents=True,exist_ok=True)
    index=0

    for images, truth_onehot in ds:
        probs = model.predict(images, verbose=0) # shape (B, H, W, 3)
        if a.threshold is not None:
            # Apply thresholding: if prob[..., 2] >= threshold, class 2, else argmax(prob[..., 0:2])
            damage_mask = probs[..., 2] >= a.threshold
            non_damage_pred = np.argmax(probs[..., 0:2], axis=-1)
            predicted = np.where(damage_mask, 2, non_damage_pred)
        else:
            predicted = np.argmax(probs, axis=-1)

        truth = np.argmax(truth_onehot.numpy(), axis=-1)
        for pred, gt, img in zip(predicted, truth, images.numpy()):
            np.add.at(conf, (gt.ravel(), pred.ravel()), 1)
            gt_crop = (gt > 0).sum()
            pr_crop = (pred > 0).sum()
            gt_damage = 100.0 * (gt == 2).sum() / gt_crop if gt_crop else 0.0
            pr_damage = 100.0 * (pred == 2).sum() / pr_crop if pr_crop else 0.0
            damage_errors.append([gt_damage, pr_damage])

            if index < 24:
                palette = np.array([[0,0,0],[30,170,50],[220,40,35]], np.uint8)
                composite = np.concatenate([(img*255).astype(np.uint8), palette[gt], palette[pred]], axis=1)
                Image.fromarray(composite).save(visuals / f"{records[index]['filename']}.png")
            index += 1

    report = metrics(conf)
    err = np.asarray(damage_errors)
    report.update({
        "evaluation_split": a.split,
        "eval_images": len(records),
        "damage_threshold": a.threshold if a.threshold is not None else "argmax",
        "confusion_matrix": conf.tolist(),
        "damage_percentage": {
            "mae": float(np.mean(np.abs(err[:,0]-err[:,1]))),
            "rmse": float(np.sqrt(np.mean((err[:,0]-err[:,1])**2))),
            "ground_truth_mean": float(np.mean(err[:,0])),
            "predicted_mean": float(np.mean(err[:,1])),
            "correlation": float(np.corrcoef(err[:,0],err[:,1])[0,1]) if len(err)>1 and np.std(err[:,0]) and np.std(err[:,1]) else None
        }
    })
    Path(a.output).mkdir(parents=True, exist_ok=True)
    out_file = "final_test_report.json" if a.split == "test" else f"eval_{a.split}_report.json"
    (Path(a.output) / out_file).write_text(json.dumps(report, indent=2), encoding="utf-8")

if __name__ == "__main__": main()

