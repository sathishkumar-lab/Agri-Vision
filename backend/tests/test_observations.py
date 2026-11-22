import io
import os
import unittest
from PIL import Image
from fastapi.testclient import TestClient

from app.main import app
from app.services.farmer_repository import register_farmer, create_farm
from app.services.observation_repository import (
    initialize_observation_schema,
    get_observation,
    get_farm_observations,
    get_farm_timeline,
)
from app.services.claim_repository import save_claim_evidence, get_claim

client = TestClient(app)


def create_test_image_bytes(color="green", size=(224, 224)):
    img = Image.new("RGB", size, color=color)
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


class TestObservationModule(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        initialize_observation_schema()
        cls.img_bytes = create_test_image_bytes("green", (224, 224))

        # Register Farmer A and Farm A
        cls.mobile_a = f"9110{int(os.urandom(4).hex(), 16) % 1000000:06d}"
        cls.farmer_a = register_farmer({
            "full_name": "Farmer Alice",
            "mobile_number": cls.mobile_a,
            "address": "Village 1",
            "district": "Ludhiana",
            "state": "Punjab",
            "password": "Password123",
        })
        cls.farm_a = create_farm({
            "farmer_id": cls.farmer_a["id"],
            "crop_type": "Wheat (HD-2967)",
            "area_acres": 4.0,
            "survey_number": "SY-001",
            "latitude": 30.9010,
            "longitude": 75.8573,
        })

        # Register Farmer B and Farm B
        cls.mobile_b = f"9220{int(os.urandom(4).hex(), 16) % 1000000:06d}"
        cls.farmer_b = register_farmer({
            "full_name": "Farmer Bob",
            "mobile_number": cls.mobile_b,
            "address": "Village 2",
            "district": "Patiala",
            "state": "Punjab",
            "password": "Password123",
        })
        cls.farm_b = create_farm({
            "farmer_id": cls.farmer_b["id"],
            "crop_type": "Durum Wheat",
            "area_acres": 2.5,
            "survey_number": "SY-002",
            "latitude": 30.3398,
            "longitude": 76.3869,
        })

    def _build_10_image_payload(self):
        zones = []
        image_types = []
        files = []

        # 5 Zones: zone_1 to zone_5 with 1 close_up and 1 field_view each
        for z in range(1, 6):
            zone_name = f"zone_{z}"
            zones.extend([zone_name, zone_name])
            image_types.extend(["close_up", "field_view"])
            files.append(("files", (f"close_z{z}.jpg", self.img_bytes, "image/jpeg")))
            files.append(("files", (f"field_z{z}.jpg", self.img_bytes, "image/jpeg")))

        return files, zones, image_types

    def test_01_observation_creation_and_ai_pipeline(self):
        files, zones, image_types = self._build_10_image_payload()
        data = {
            "farm_id": self.farm_a["id"],
            "farmer_id": self.farmer_a["farmer_code"],
            "latitude": "30.9012",
            "longitude": "75.8575",
            "gps_accuracy": "4.5",
            "gps_source": "browser",
            "observation_date": "2026-09-01T10:00:00Z",
            "zones": ",".join(zones),
            "image_types": ",".join(image_types),
        }

        resp = client.post("/api/observations", data=data, files=files)
        self.assertEqual(resp.status_code, 200, f"Response: {resp.text}")
        body = resp.json()
        self.assertIn("observation", body)
        obs = body["observation"]

        self.assertTrue(obs["observation_code"].startswith("OBS-2026-"))
        self.assertEqual(obs["status"], "finalized")
        self.assertEqual(obs["image_count"], 10)
        self.assertEqual(obs["close_up_count"], 5)
        self.assertEqual(obs["field_view_count"], 5)
        self.assertIsNotNone(obs["disease_result"])
        self.assertIsNotNone(obs["damage_percentage"])
        self.assertIsNotNone(obs["evidence_score"])

        self.assertEqual(len(obs["images"]), 10)

    def test_02_farm_ownership_authorization(self):
        # Farmer B tries to submit observation for Farmer A's farm
        files, zones, image_types = self._build_10_image_payload()
        data = {
            "farm_id": self.farm_a["id"],
            "farmer_id": self.farmer_b["farmer_code"],  # Bob doesn't own Farm A
            "latitude": "30.9012",
            "longitude": "75.8575",
            "zones": ",".join(zones),
            "image_types": ",".join(image_types),
        }

        resp = client.post("/api/observations", data=data, files=files)
        self.assertEqual(resp.status_code, 403)
        self.assertIn("Unauthorized", resp.json()["detail"])

    def test_03_image_count_validation(self):
        # Submit only 4 images instead of 10
        files = [("files", (f"img_{i}.jpg", self.img_bytes, "image/jpeg")) for i in range(4)]
        zones = ["zone_1", "zone_1", "zone_2", "zone_2"]
        types = ["close_up", "field_view", "close_up", "field_view"]

        data = {
            "farm_id": self.farm_a["id"],
            "farmer_id": self.farmer_a["farmer_code"],
            "latitude": "30.9012",
            "longitude": "75.8575",
            "zones": ",".join(zones),
            "image_types": ",".join(types),
        }

        resp = client.post("/api/observations", data=data, files=files)
        self.assertEqual(resp.status_code, 400)
        self.assertIn("10 images", resp.json()["detail"])

    def test_04_duplicate_zone_prevention(self):
        # Submit 2 close-up images for zone_1
        files, zones, image_types = self._build_10_image_payload()
        # Corrupt zones so zone_1 has two close-ups and zone_2 has no close-up
        image_types[2] = "close_up"  # zone_2 close_up converted to zone_1 close_up
        zones[2] = "zone_1"

        data = {
            "farm_id": self.farm_a["id"],
            "farmer_id": self.farmer_a["farmer_code"],
            "latitude": "30.9012",
            "longitude": "75.8575",
            "zones": ",".join(zones),
            "image_types": ",".join(image_types),
        }

        resp = client.post("/api/observations", data=data, files=files)
        self.assertEqual(resp.status_code, 400)
        self.assertIn("Duplicate close-up image for zone_1", resp.json()["detail"])

    def test_05_chronological_timeline_and_consecutive_comparison(self):
        # Create Observation 2 for Farm A (a week later)
        files, zones, image_types = self._build_10_image_payload()
        data = {
            "farm_id": self.farm_a["id"],
            "farmer_id": self.farmer_a["farmer_code"],
            "latitude": "30.9015",
            "longitude": "75.8578",
            "observation_date": "2026-09-08T10:00:00Z",
            "zones": ",".join(zones),
            "image_types": ",".join(image_types),
        }

        resp2 = client.post("/api/observations", data=data, files=files)
        self.assertEqual(resp2.status_code, 200)

        # Get timeline for Farm A
        resp_tl = client.get(f"/api/farms/{self.farm_a['id']}/observations/timeline")
        self.assertEqual(resp_tl.status_code, 200)
        tl = resp_tl.json()

        self.assertEqual(tl["total_observations"], 2)
        self.assertTrue(tl["trend_available"])
        self.assertEqual(len(tl["consecutive_comparisons"]), 1)

        comp = tl["consecutive_comparisons"][0]
        self.assertIn("damage_change_percentage_points", comp)
        self.assertIn("disease_changed", comp)
        self.assertIn("gps_distance_from_farm_km", comp)

    def test_06_claim_integration_with_observation_history(self):
        # Submit claim referencing Farm A
        claim_payload = {
            "farmer_name": self.farmer_a["full_name"],
            "farmer_id": self.farmer_a["farmer_code"],
            "farm_name": "Farm A Wheat Parcel",
            "crop_variety": "Durum Wheat",
            "farm_latitude": 30.9010,
            "farm_longitude": 75.8573,
            "claim_latitude": 30.9015,
            "claim_longitude": 75.8578,
            "db_farmer_id": self.farmer_a["id"],
            "db_farm_id": self.farm_a["id"],
            "farmer_code": self.farmer_a["farmer_code"],
            "farm_code": self.farm_a["farm_code"],
            "disease_analysis": {"final_prediction": "Septoria", "overall_confidence": 88.0},
            "damage_analysis": {"overall_damage_percentage": 25.0},
        }

        resp_claim = client.post("/api/claims", json=claim_payload)
        self.assertEqual(resp_claim.status_code, 200)
        claim_id = resp_claim.json()["claim_id"]

        # Retrieve claim and verify historical observations attached
        resp_get = client.get(f"/api/claims/{claim_id}")
        self.assertEqual(resp_get.status_code, 200)
        claim_data = resp_get.json()

        ev = claim_data["ai_evidence"]
        self.assertIn("historical_observations", ev)
        hist = ev["historical_observations"]
        self.assertGreaterEqual(hist["total_observations"], 2)


if __name__ == "__main__":
    unittest.main()
