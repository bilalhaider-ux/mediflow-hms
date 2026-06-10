import time
import requests
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

class CreateRoomView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        appointment_id = request.data.get("appointment_id")
        if not appointment_id:
            return Response({"error": "appointment_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        api_key = getattr(settings, "DAILY_API_KEY", "")
        room_name = f"mediflow-appt-{appointment_id}"

        # Safe fallback if DAILY_API_KEY is not configured
        if not api_key:
            mock_url = f"https://mediflow-test.daily.co/{room_name}"
            return Response({
                "url": mock_url,
                "name": room_name,
                "warning": "DAILY_API_KEY not configured. Running in demo fallback mode."
            }, status=status.HTTP_200_OK)

        try:
            res = requests.post(
                "https://api.daily.co/v1/rooms",
                headers={"Authorization": f"Bearer {api_key}"},
                json={
                    "name": room_name,
                    "properties": { "exp": int(time.time()) + 3600 }
                }
            )

            # Check if Daily API returns success (201 Created or 200 OK)
            if res.status_code in (200, 201):
                return Response(res.json(), status=status.HTTP_201_CREATED)

            res_json = res.json()

            # Handle room already exists error
            if res.status_code == 400 and "already exists" in str(res_json.get("info", "")):
                # Retrieve existing room details
                get_res = requests.get(
                    f"https://api.daily.co/v1/rooms/{room_name}",
                    headers={"Authorization": f"Bearer {api_key}"}
                )
                if get_res.status_code == 200:
                    return Response(get_res.json(), status=status.HTTP_200_OK)
                else:
                    # Construct URL fallback if retrieve fails
                    return Response({
                        "url": f"https://api.daily.co/{room_name}",
                        "name": room_name,
                        "info": "Room already exists (retrieve failed)"
                    }, status=status.HTTP_200_OK)

            return Response(res_json, status=res.status_code)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
