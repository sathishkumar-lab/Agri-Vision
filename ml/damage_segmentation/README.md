# Real-world wheat damage segmentation

This is the three-class field-view segmentation pipeline for Agri-Vision: `0 = background`, `1 = healthy wheat crop`, `2 = damaged wheat crop`. Every architecture is a randomly initialized U-Net variant. It never imports an application encoder, ImageNet weights, a pretrained checkpoint, synthetic images, or synthetic masks.

## Audit finding (2026-09-18)

The repository contains 50 pairs under `synthetic_dataset/`, copied into `dataset_split/`, and legacy binary checkpoints (`best_damage_segmentation_model.keras` and `best_damage_segmentation_stage2.keras`). They are excluded from this pipeline and must not be described as real-world performance. `dataset/images`, `dataset/masks`, and `dataset/raw_images` contain no files. Consequently, no valid training run, final test result, or 90% target claim exists yet.

## Add the required real data

Place only real field-view photographs and matching pixel masks here:

```
datasets/real_world/images/<same filename>.jpg|png
datasets/real_world/masks/<same filename>.png
datasets/real_world/groups.csv
```

Masks must have the exact same filename, be single-channel class IDs `0/1/2`, and `groups.csv` must contain `filename,group_id`. A group is a field, farmer claim, observation session, or capture sequence; no group is split across train/validation/test.

## Reproducible procedure

```powershell
python -m ml.damage_segmentation.preprocessing.audit_dataset --images ml/damage_segmentation/datasets/real_world/images --masks ml/damage_segmentation/datasets/real_world/masks --report ml/damage_segmentation/results/dataset_audit.json
python -m ml.damage_segmentation.preprocessing.make_split --images ml/damage_segmentation/datasets/real_world/images --masks ml/damage_segmentation/datasets/real_world/masks --groups ml/damage_segmentation/datasets/real_world/groups.csv --manifest ml/damage_segmentation/datasets/real_world/split_manifest.json --confirm-real-world
python -m ml.damage_segmentation.training.train --manifest ml/damage_segmentation/datasets/real_world/split_manifest.json --output ml/damage_segmentation/models/experiment_01 --architecture unet --loss cce
python -m ml.damage_segmentation.training.train --manifest ml/damage_segmentation/datasets/real_world/split_manifest.json --output ml/damage_segmentation/models/experiment_03 --architecture unet --loss dice_cce
python -m ml.damage_segmentation.training.train --manifest ml/damage_segmentation/datasets/real_world/split_manifest.json --output ml/damage_segmentation/models/experiment_04 --architecture residual_unet --loss dice_cce
python -m ml.damage_segmentation.training.train --manifest ml/damage_segmentation/datasets/real_world/split_manifest.json --output ml/damage_segmentation/models/experiment_05 --architecture attention_unet --loss dice_cce
```

Compare candidates only on validation performance, prioritizing damaged-class IoU and Dice. Run this command once for the selected model; it consumes only the frozen `test` records and writes `final_test_report.json`, a confusion matrix, damage-percentage MAE, and unselected visual comparisons.

```powershell
python -m ml.damage_segmentation.evaluation.evaluate --manifest ml/damage_segmentation/datasets/real_world/split_manifest.json --model ml/damage_segmentation/models/experiment_03/best.keras --output ml/damage_segmentation/results/final_test
```

Deploy only after that evaluation: copy the selected `best.keras` and its adjacent `config.json` into `ml/damage_segmentation/models/production/`. The FastAPI damage endpoint is deliberately unavailable before this step. At inference, images are RGB, bilinear resized and divided by 255; masks are resized with nearest-neighbour. Damage is `damaged_crop_pixels / (healthy_crop_pixels + damaged_crop_pixels) * 100`; background never enters the denominator.

## Data and performance limitations

Pixel-perfect annotation and provenance cannot be inferred from files alone; visually review mask boundaries and investigate every audit warning before splitting. With no real annotated data currently in the project, additional data is mandatory. Collect at least several hundred independently grouped field views, with pixel-level labels across low/moderate/high damage, cultivars, growth stages, lighting, dense/sparse canopy, soil/background visibility, and fields/farms. Report actual held-out values, including per-class precision/recall/F1/IoU/Dice and damaged-class metrics; never infer success from pixel accuracy alone.
