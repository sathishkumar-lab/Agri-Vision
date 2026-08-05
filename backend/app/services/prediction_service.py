import json
from pathlib import Path

import numpy as np
from PIL import Image
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input
from tensorflow.keras.models import load_model


PROJECT_ROOT = Path(__file__).resolve().parents[3]

MODEL_PATH = PROJECT_ROOT / "ml" / "final_wheat_inference_model.keras"
CLASS_NAMES_PATH = PROJECT_ROOT / "ml" / "class_names.json"


def load_class_names() -> list[str]:
    """
    Read and return the class names stored in class_names.json.
    """

    if not CLASS_NAMES_PATH.exists():
        raise FileNotFoundError(
            f"Class names file was not found: {CLASS_NAMES_PATH}"
        )

    with CLASS_NAMES_PATH.open("r", encoding="utf-8") as file:
        class_names = json.load(file)

    if not isinstance(class_names, list) or not class_names:
        raise ValueError(
            "class_names.json must contain a non-empty JSON list."
        )

    return class_names


if not MODEL_PATH.exists():
    raise FileNotFoundError(
        f"Trained model file was not found: {MODEL_PATH}"
    )


print(f"Loading trained model from: {MODEL_PATH}")

model = load_model(MODEL_PATH)
class_names = load_class_names()

print("Trained model loaded successfully.")
print(f"Available classes: {class_names}")


def predict_image(image_path: str | Path) -> dict:
    """
    Predict the wheat disease class for one image.
    """

    image_path = Path(image_path)

    if not image_path.exists():
        raise FileNotFoundError(
            f"Prediction image was not found: {image_path}"
        )

    with Image.open(image_path) as image:
        image = image.convert("RGB")
        image = image.resize((224, 224))

        image_array = np.array(image, dtype=np.float32)

    image_batch = np.expand_dims(image_array, axis=0)
    prepared_image = preprocess_input(image_batch)

    predictions = model.predict(prepared_image, verbose=0)

    predicted_index = int(np.argmax(predictions[0]))
    confidence = float(predictions[0][predicted_index]) * 100

    if predicted_index >= len(class_names):
        raise ValueError(
            "The model output does not match the number of class names."
        )

    return {
        "prediction": class_names[predicted_index],
        "confidence": round(confidence, 2),
    }