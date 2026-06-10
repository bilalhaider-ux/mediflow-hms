import os
import logging
from django.conf import settings
from notifications.models import WhatsAppLog

try:
    from twilio.rest import Client
    TWILIO_AVAILABLE = True
except ImportError:
    TWILIO_AVAILABLE = False

logger = logging.getLogger(__name__)

class WhatsAppService:
    def __init__(self):
        # Allow fallback client initialization if Twilio credentials are missing or empty
        account_sid = getattr(settings, "TWILIO_ACCOUNT_SID", None) or os.environ.get("TWILIO_ACCOUNT_SID")
        auth_token = getattr(settings, "TWILIO_AUTH_TOKEN", None) or os.environ.get("TWILIO_AUTH_TOKEN")
        if account_sid and auth_token:
            self.client = Client(account_sid, auth_token)
        else:
            self.client = None

    def send(self, to_phone, message):
        # 1. Always create the DB log record first
        WhatsAppLog.objects.create(
            phone=to_phone,
            message_body=message,
            message_type="REMINDER"
        )
        
        if not self.client:
            logger.warning(f"[WhatsApp Fallback] Twilio unconfigured. Logged: {message}")
            return None

        # Clean phone format
        clean_phone = to_phone.strip()
        to_formatted = f"whatsapp:+92{clean_phone.lstrip('0')}"
        from_number = getattr(settings, "TWILIO_WHATSAPP_FROM", "whatsapp:+14155238886")

        try:
            msg = self.client.messages.create(
                from_=from_number,
                to=to_formatted,
                body=message
            )
            return msg.sid
        except Exception as e:
            logger.error(f"WhatsApp failed: {e}")
            return None

    @staticmethod
    def send_message(phone, message, message_type="OTHER"):
        # Format local Pakistani phone numbers to standard E.164 for Twilio
        clean_phone = phone.strip()
        if clean_phone.startswith("0") and len(clean_phone) == 11:
            clean_phone = "+92" + clean_phone[1:]
        elif not clean_phone.startswith("+") and not clean_phone.startswith("whatsapp:"):
            clean_phone = "+" + clean_phone
            
        to_number = clean_phone
        if not to_number.startswith("whatsapp:"):
            to_number = f"whatsapp:{to_number}"

        # 1. Always create the DB log record first (as required)
        log_record = WhatsAppLog.objects.create(
            phone=phone,
            message_body=message,
            message_type=message_type
        )

        account_sid = getattr(settings, "TWILIO_ACCOUNT_SID", None) or os.environ.get("TWILIO_ACCOUNT_SID")
        auth_token = getattr(settings, "TWILIO_AUTH_TOKEN", None) or os.environ.get("TWILIO_AUTH_TOKEN")
        from_number = getattr(settings, "TWILIO_WHATSAPP_FROM", "whatsapp:+14155238886")

        if TWILIO_AVAILABLE and account_sid and auth_token:
            try:
                client = Client(account_sid, auth_token)
                client.messages.create(
                    body=message,
                    from_=from_number,
                    to=to_number
                )
                print(f"[Twilio] Secure WhatsApp message dispatched to {to_number}.")
                return True
            except Exception as e:
                print(f"[Twilio] API dispatch failed for {to_number}: {e}")
                return False
        else:
            print(f"[WhatsApp Fallback] Twilio unconfigured/missing. Logged: {message}")
            return False
