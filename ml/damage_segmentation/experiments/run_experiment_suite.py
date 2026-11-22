"""Run controlled model experimentation suite across architectures, loss functions, and resolutions.
Evaluate exclusively on validation split for model selection.
"""
from __future__ import annotations
import json, os, subprocess, sys
from pathlib import Path

PYTHON = sys.executable
MANIFEST = "ml/damage_segmentation/datasets/real_world/split_manifest.json"
RESULTS_DIR = Path("ml/damage_segmentation/results/experiments")
RESULTS_DIR.mkdir(parents=True, exist_ok=True)

# List of experiment configurations to evaluate
EXPERIMENTS = [
    {
        "name": "exp01_baseline_unet_dice_cce",
        "architecture": "unet",
        "loss": "dice_cce",
        "input_size": 256,
        "base_filters": 16,
        "epochs": 25,
        "batch_size": 8,
        "learning_rate": 1e-3
    },
    {
        "name": "exp02_residual_unet_dice_cce",
        "architecture": "residual_unet",
        "loss": "dice_cce",
        "input_size": 256,
        "base_filters": 16,
        "epochs": 25,
        "batch_size": 8,
        "learning_rate": 1e-3
    },
    {
        "name": "exp03_attention_unet_dice_cce",
        "architecture": "attention_unet",
        "loss": "dice_cce",
        "input_size": 256,
        "base_filters": 16,
        "epochs": 25,
        "batch_size": 8,
        "learning_rate": 1e-3
    },
    {
        "name": "exp04_mobilenet_unet_dice_cce",
        "architecture": "mobilenet_unet",
        "loss": "dice_cce",
        "input_size": 256,
        "base_filters": 32,
        "epochs": 25,
        "batch_size": 8,
        "learning_rate": 1e-3
    },
    {
        "name": "exp05_attention_unet_weighted_w5",
        "architecture": "attention_unet",
        "loss": "weighted_dice_cce_w5",
        "input_size": 256,
        "base_filters": 16,
        "epochs": 25,
        "batch_size": 8,
        "learning_rate": 1e-3
    },
    {
        "name": "exp06_mobilenet_unet_weighted_w5",
        "architecture": "mobilenet_unet",
        "loss": "weighted_dice_cce_w5",
        "input_size": 256,
        "base_filters": 32,
        "epochs": 25,
        "batch_size": 8,
        "learning_rate": 1e-3
    },
    {
        "name": "exp07_mobilenet_unet_weighted_w10",
        "architecture": "mobilenet_unet",
        "loss": "weighted_dice_cce_w10",
        "input_size": 256,
        "base_filters": 32,
        "epochs": 25,
        "batch_size": 8,
        "learning_rate": 1e-3
    }
]

def run_cmd(cmd):
    print("Executing:", " ".join(cmd))
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        print("ERROR:", res.stderr)
        raise RuntimeError(f"Command failed with return code {res.returncode}")

def main():
    summary_results = []
    
    for exp in EXPERIMENTS:
        exp_dir = RESULTS_DIR / exp["name"]
        exp_dir.mkdir(parents=True, exist_ok=True)
        model_path = exp_dir / "best.keras"
        val_report_path = exp_dir / "eval_validation_report.json"
        
        # Train if model doesn't exist
        if not model_path.exists():
            print(f"\n==========================================")
            print(f"Running Experiment: {exp['name']}")
            print(f"==========================================")
            train_cmd = [
                PYTHON, "-m", "ml.damage_segmentation.training.train",
                "--manifest", MANIFEST,
                "--output", str(exp_dir),
                "--architecture", exp["architecture"],
                "--loss", exp["loss"],
                "--input-size", str(exp["input_size"]),
                "--base-filters", str(exp["base_filters"]),
                "--batch-size", str(exp["batch_size"]),
                "--epochs", str(exp["epochs"]),
                "--learning-rate", str(exp["learning_rate"])
            ]
            run_cmd(train_cmd)
        
        # Evaluate on Validation split strictly
        if not val_report_path.exists():
            eval_cmd = [
                PYTHON, "-m", "ml.damage_segmentation.evaluation.evaluate",
                "--manifest", MANIFEST,
                "--model", str(model_path),
                "--output", str(exp_dir),
                "--split", "validation",
                "--batch-size", str(exp["batch_size"])
            ]
            run_cmd(eval_cmd)
        
        # Read validation report
        report = json.loads(val_report_path.read_text(encoding="utf-8"))
        damage_cls = report["classes"]["damaged_wheat_crop"]
        healthy_cls = report["classes"]["healthy_wheat_crop"]
        
        res = {
            "name": exp["name"],
            "architecture": exp["architecture"],
            "loss": exp["loss"],
            "input_size": exp["input_size"],
            "val_pixel_acc": report["pixel_accuracy"],
            "val_healthy_dice": healthy_cls["dice"],
            "val_healthy_iou": healthy_cls["iou"],
            "val_damage_iou": damage_cls["iou"],
            "val_damage_dice": damage_cls["dice"],
            "val_damage_precision": damage_cls["precision"],
            "val_damage_recall": damage_cls["recall"],
            "val_mean_iou": report["mean_iou"],
            "val_damage_mae": report["damage_percentage"]["mae"],
            "val_damage_rmse": report["damage_percentage"]["rmse"],
            "val_damage_corr": report["damage_percentage"]["correlation"]
        }
        summary_results.append(res)
        print(f"Exp: {exp['name']} | Val Damage IoU: {res['val_damage_iou']:.4f} | Val Damage Dice: {res['val_damage_dice']:.4f} | Val Damage Precision: {res['val_damage_precision']:.4f} | Val Damage MAE: {res['val_damage_mae']:.2f}%")

    # Save summary report
    summary_file = RESULTS_DIR / "experiment_summary.json"
    summary_file.write_text(json.dumps(summary_results, indent=2), encoding="utf-8")
    print(f"\nSaved experiment summary to {summary_file}")

if __name__ == "__main__":
    main()
