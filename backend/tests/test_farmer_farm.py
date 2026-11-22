import os
import unittest
from uuid import UUID
from fastapi.testclient import TestClient

from app.main import app
from app.services.farmer_repository import (
    register_farmer,
    authenticate_farmer,
    get_farmer_by_mobile,
    get_farmer_by_code,
    create_farm,
    get_farms_by_farmer,
    get_farm_by_id,
    initialize_farmer_schema,
)
from app.services.claim_repository import (
    save_claim_evidence,
    get_claim,
)

client = TestClient(app)


class TestFarmerFarmModule(unittest.TestCase):

    def setUp(self):
        initialize_farmer_schema()

    def test_01_farmer_registration_and_authentication(self):
        mobile = f"9990{int(os.urandom(4).hex(), 16) % 1000000:06d}"
        reg_payload = {
            "full_name": "Test Farmer",
            "mobile_number": mobile,
            "email": "farmer@test.com",
            "address": "123 Farm Lane",
            "district": "Ludhiana",
            "state": "Punjab",
            "password": "SecretPassword123",
        }
        farmer = register_farmer(reg_payload)
        self.assertIn("id", farmer)
        self.assertIn("farmer_code", farmer)
        self.assertEqual(farmer["full_name"], "Test Farmer")
        self.assertEqual(farmer["mobile_number"], mobile)
        self.assertNotIn("password_hash", farmer)

        # Authenticate by mobile
        auth1 = authenticate_farmer(mobile, "SecretPassword123")
        self.assertIsNotNone(auth1)
        self.assertEqual(auth1["id"], farmer["id"])

        # Authenticate by farmer_code
        auth2 = authenticate_farmer(farmer["farmer_code"], "SecretPassword123")
        self.assertIsNotNone(auth2)

        # Invalid password
        auth_invalid = authenticate_farmer(mobile, "WrongPassword")
        self.assertIsNone(auth_invalid)

    def test_02_farm_creation_and_linking(self):
        mobile = f"9880{int(os.urandom(4).hex(), 16) % 1000000:06d}"
        farmer = register_farmer({
            "full_name": "Farm Owner",
            "mobile_number": mobile,
            "address": "Village A",
            "district": "Amritsar",
            "state": "Punjab",
            "password": "pass",
        })

        farm_payload = {
            "farmer_id": farmer["id"],
            "crop_type": "Durum Wheat",
            "area_acres": 4.5,
            "survey_number": "SY-102",
            "latitude": 31.6340,
            "longitude": 74.8723,
        }

        farm = create_farm(farm_payload)
        self.assertIn("id", farm)
        self.assertEqual(farm["farmer_id"], farmer["id"])
        self.assertTrue(farm["farm_code"].startswith("FARM-2026-"))
        self.assertEqual(farm["area_acres"], 4.5)

        # Retrieve farms by farmer
        farms = get_farms_by_farmer(farmer["id"])
        self.assertGreaterEqual(len(farms), 1)

        # Retrieve single farm by id/code
        fetched = get_farm_by_id(farm["id"])
        self.assertIsNotNone(fetched)
        self.assertEqual(fetched["farm_code"], farm["farm_code"])

    def test_03_claim_integration_with_farmer_and_farm(self):
        mobile = f"9770{int(os.urandom(4).hex(), 16) % 1000000:06d}"
        farmer = register_farmer({
            "full_name": "Claimant Farmer",
            "mobile_number": mobile,
            "address": "Village B",
            "district": "Patiala",
            "state": "Punjab",
            "password": "pass",
        })

        farm = create_farm({
            "farmer_id": farmer["id"],
            "crop_type": "Wheat",
            "area_acres": 10.0,
            "latitude": 30.3398,
            "longitude": 76.3869,
        })

        claim_payload = {
            "farmer_name": farmer["full_name"],
            "farmer_id": farmer["farmer_code"],
            "farm_name": "Patiala Plot",
            "crop_variety": "Wheat",
            "db_farmer_id": farmer["id"],
            "db_farm_id": farm["id"],
            "farmer_code": farmer["farmer_code"],
            "farm_code": farm["farm_code"],
            "disease_analysis": {"overall_confidence": 90.0, "final_prediction": "Septoria"},
            "damage_analysis": {"overall_damage_percentage": 35.0},
        }

        claim_id = save_claim_evidence(claim_payload)
        self.assertIsNotNone(claim_id)

        saved = get_claim(claim_id)
        self.assertIsNotNone(saved)
        self.assertEqual(saved["ai_evidence"]["farmer_code"], farmer["farmer_code"])
        self.assertEqual(saved["ai_evidence"]["farm_code"], farm["farm_code"])

    def test_04_fastapi_endpoints(self):
        mobile = f"9660{int(os.urandom(4).hex(), 16) % 1000000:06d}"

        # 1. Register API
        r_reg = client.post("/api/farmers/register", json={
            "full_name": "API Farmer",
            "mobile_number": mobile,
            "address": "Addr",
            "district": "Dist",
            "state": "State",
            "password": "mysecretpassword"
        })
        self.assertEqual(r_reg.status_code, 200)
        farmer_data = r_reg.json()["farmer"]
        farmer_code = farmer_data["farmer_code"]

        # 2. Login API
        r_login = client.post("/api/farmers/login", json={
            "identifier": mobile,
            "password": "mysecretpassword"
        })
        self.assertEqual(r_login.status_code, 200)

        # 3. Create Farm API
        r_farm = client.post("/api/farms", json={
            "farmer_id": farmer_code,
            "crop_type": "Durum Wheat",
            "area_acres": 6.2,
            "survey_number": "777",
            "latitude": 31.0,
            "longitude": 75.0
        })
        self.assertEqual(r_farm.status_code, 200)

        # 4. List Farms API
        r_myfarms = client.get(f"/api/farms/my-farms/{farmer_code}")
        self.assertEqual(r_myfarms.status_code, 200)
        self.assertGreaterEqual(r_myfarms.json()["total_farms"], 1)


if __name__ == "__main__":
    unittest.main()
