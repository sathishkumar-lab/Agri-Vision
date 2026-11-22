"""Create a deterministic, group-aware 70/15/15 split manifest without copying data."""
from __future__ import annotations
import argparse, csv, json, random
from pathlib import Path

def groups(path: Path | None) -> dict:
    if not path or not path.exists(): return {}
    with path.open(newline="", encoding="utf-8") as f: return {r["filename"]: r["group_id"] for r in csv.DictReader(f)}

if __name__ == "__main__":
    p = argparse.ArgumentParser(); p.add_argument("--images", type=Path, required=True); p.add_argument("--masks", type=Path, required=True); p.add_argument("--manifest", type=Path, required=True); p.add_argument("--groups", type=Path, required=True, help="filename,group_id; keeps field/session/claim together"); p.add_argument("--seed", type=int, default=2026); p.add_argument("--confirm-real-world", action="store_true", help="Required assertion that these are real field photographs and annotations.")
    a = p.parse_args(); files = sorted(x.name for x in a.images.iterdir() if x.suffix.lower() in {".png", ".jpg", ".jpeg"}); g = groups(a.groups)
    if not a.confirm_real_world: raise ValueError("Refusing to create a training manifest without --confirm-real-world.")
    if not files: raise ValueError("No field images found.")
    if set(files) - set(g): raise ValueError("groups.csv must identify every image to prevent group leakage.")
    if any(not (a.masks / x).exists() for x in files): raise ValueError("Every image must have a same-named mask.")
    group_map = {}; [group_map.setdefault(g.get(x, x), []).append(x) for x in files]
    ids = list(group_map); random.Random(a.seed).shuffle(ids); n = len(ids); cut1, cut2 = round(n*.70), round(n*.85)
    partition = {gid: "train" if i < cut1 else "validation" if i < cut2 else "test" for i, gid in enumerate(ids)}
    entries = [{"filename": x, "image": str((a.images/x).resolve()), "mask": str((a.masks/x).resolve()), "group_id": g.get(x, x), "split": partition[g.get(x, x)]} for x in files]
    a.manifest.parent.mkdir(parents=True, exist_ok=True); a.manifest.write_text(json.dumps({"seed": a.seed, "data_provenance": "real_world", "groups_file": str(a.groups.resolve()), "entries": entries}, indent=2), encoding="utf-8")
