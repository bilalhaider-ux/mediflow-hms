import random
import time

class MockMobileWalletGateway:
    @staticmethod
    def initiate_payment(phone_number: str, amount: float, method: str):
        """
        Simulates USSD/App push notification prompt for EasyPaisa or JazzCash.
        If the phone number ends with '999', it simulates a failed transaction.
        Otherwise, it simulates a successful transaction.
        """
        # Validate phone number length and format roughly
        cleaned_phone = "".join(filter(str.isdigit, phone_number))
        if len(cleaned_phone) < 10:
            return {
                "success": False,
                "status": "FAILED",
                "message": "Invalid mobile number format.",
                "transaction_id": None
            }

        # Simulate delay
        time.sleep(0.5)

        # Trigger simulated failure
        if cleaned_phone.endswith("999"):
            return {
                "success": False,
                "status": "FAILED",
                "message": "Transaction declined by customer (PIN Timeout / Cancellation).",
                "transaction_id": None
            }

        # Generate a mock transaction reference
        prefix = "JC" if method.upper() == "JAZZCASH" else "EP"
        random_digits = "".join(random.choices("0123456789", k=8))
        txn_id = f"TXN-{prefix}-{random_digits}"

        return {
            "success": True,
            "status": "COMPLETED",
            "message": f"Successfully charged Rs. {amount:.2f} via {method}.",
            "transaction_id": txn_id
        }
