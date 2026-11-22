from pathlib import Path

import numpy as np
from PIL import Image
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input
from tensorflow.keras.models import load_model


PROJECT_ROOT = Path(__file__).resolve().parents[3]

# This is the sole approved disease checkpoint for production inference.
MODEL_PATH = PROJECT_ROOT / "models" / "final_wheat_inference_model.keras"
CLASS_NAMES = ["Healthy", "septoria", "stripe_rust"]


if not MODEL_PATH.exists():
    raise FileNotFoundError(
        f"Approved disease model was not found: {MODEL_PATH}"
    )


print(f"Loading approved disease model from: {MODEL_PATH}")

model = load_model(MODEL_PATH, compile=False)

if model.input_shape != (None, 224, 224, 3):
    raise ValueError(
        f"Unexpected disease model input shape: {model.input_shape}"
    )

if model.output_shape != (None, 3):
    raise ValueError(
        f"Unexpected disease model output shape: {model.output_shape}"
    )

print("Approved disease model loaded successfully.")


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

    if predicted_index >= len(CLASS_NAMES):
        raise ValueError(
            "The model output does not match the number of class names."
        )

    return {
        "prediction": CLASS_NAMES[predicted_index],
        "confidence": round(confidence, 2),
    }
