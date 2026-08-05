from collections import defaultdict
from typing import Any


def aggregate_predictions(
    predictions: list[dict[str, Any]],
) -> dict[str, Any]:
    """
    Combine several image predictions into one final prediction.

    The final disease is selected using majority voting.

    If two or more diseases receive the same number of votes,
    the disease with the highest average confidence is selected.

    Args:
        predictions:
            A list containing the prediction result for each image.

            Each dictionary must contain:
            - filename
            - prediction
            - confidence

    Returns:
        A dictionary containing:
        - prediction
        - overall_confidence
        - supporting_images
        - total_images
        - vote_distribution

    Raises:
        ValueError:
            If the predictions list is empty.
    """

    if not predictions:
        raise ValueError(
            "At least one prediction is required for aggregation."
        )

    confidence_groups: dict[str, list[float]] = defaultdict(list)

    for result in predictions:
        disease_name = result["prediction"]
        confidence = float(result["confidence"])

        confidence_groups[disease_name].append(confidence)

    disease_statistics: dict[str, dict[str, float | int]] = {}

    for disease_name, confidence_values in confidence_groups.items():
        vote_count = len(confidence_values)

        average_confidence = (
            sum(confidence_values) / vote_count
        )

        disease_statistics[disease_name] = {
            "votes": vote_count,
            "average_confidence": average_confidence,
        }

    final_prediction = max(
        disease_statistics,
        key=lambda disease_name: (
            disease_statistics[disease_name]["votes"],
            disease_statistics[disease_name]["average_confidence"],
        ),
    )

    winning_statistics = disease_statistics[final_prediction]

    vote_distribution = {
        disease_name: statistics["votes"]
        for disease_name, statistics in disease_statistics.items()
    }

    return {
        "prediction": final_prediction,
        "overall_confidence": round(
            float(winning_statistics["average_confidence"]),
            2,
        ),
        "supporting_images": int(
            winning_statistics["votes"]
        ),
        "total_images": len(predictions),
        "vote_distribution": vote_distribution,
    }