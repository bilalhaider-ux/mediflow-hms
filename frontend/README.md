# MediFlow Enterprise HMS

![Django](https://img.shields.io/badge/Django-4.2-092E20?style=flat&logo=django&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-8.0-646CFF?style=flat&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind-3.x-38BDF8?style=flat&logo=tailwindcss&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=flat)

A fully functional, production-ready, full-stack **Hospital Management System** built with Django REST Framework and React 19. Designed as an enterprise-grade SaaS platform covering everything from OPD workflows to pharmacy dispensation, IPD admissions, billing, and real-time audit logging.

---

## ✨ Key Features

| Module | Description |
|---|---|
| 🔐 **RBAC Auth** | Role-based access for Admin, Doctor, Receptionist, Pharmacist, Lab Tech, Patient |
| 🏥 **OPD & Appointments** | Token queue, walk-in & online booking, consultation chamber |
| 🛏️ **IPD & Ward Map** | Bed admission, discharge, real-time ward occupancy |
| 🔬 **Diagnostics Lab** | Lab order management, result entry, PDF report generation |
| 💊 **Pharmacy** | FIFO batch dispensation, stock alerts, supplier ledger |
| 🧾 **Billing Desk** | Invoice generation, JazzCash/EasyPaisa payment support, PDF exports |
| 👥 **Staff Management** | Add doctors, receptionists, and all staff roles with user accounts |
| 🏢 **Branch Management** | Multi-branch setup with per-branch data isolation |
| ⚙️ **System Settings** | Hospital info, financial config, notification toggles, working hours |
| 📊 **Security & Audit** | Real-time middleware logs, live KPI telemetry stream, financial PDF reports |
| 📴 **Offline Sync** | IndexedDB-powered queue — works without internet, auto-syncs on reconnect |
| 🤝 **Patient Portal** | Self-service portal — view records, download lab reports, book appointments |
| 🖥️ **Lobby Kiosk** | Self-check-in terminal with token printing |
| 🏗️ **OT Scheduler** | Operation theatre booking and management |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Django 4.2, Django REST Framework, SimpleJWT |
| **Frontend** | React 19, Vite 8, Tailwind CSS, React Router v7 |
| **Database** | SQLite (dev) / PostgreSQL (prod) |
| **Auth** | JWT with refresh token rotation |
| **Offline** | IndexedDB via idb |
| **PDF** | ReportLab |
| **Icons** | Lucide React |

---

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- Git

### Backend Setup

```bash
git clone https://github.com/your-username/mediflow-hms.git
cd mediflow-hms/backend

python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux

pip install -r requirements.txt

cp .env.example .env
# Edit .env and set your DJANGO_SECRET_KEY

python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

### Frontend Setup

```bash
cd ../frontend
npm install
cp .env.example .env
# VITE_API_URL=http://localhost:8000/api
npm run dev
```

App runs at `http://localhost:5173`

---

## 👤 Demo Credentials

| Role | Username | Password |
|---|---|---|
| Admin | `admin` | `password` |
| Doctor | `doctor_ahead` | `password` |
| Receptionist | `receptionist` | `password` |

---

## 📁 Project Structure

```
mediflow-hms/
├── backend/
│   ├── authentication/     # User model, JWT, RBAC permissions
│   ├── patients/           # Patient registry, MRN generation
│   ├── clinical/           # Appointments, consultation, prescriptions, lab
│   ├── ipd/                # Wards, beds, admissions, OT
│   ├── billing/            # Invoices, payments, panels
│   ├── pharmacy/           # Medicines, stock batches, FIFO dispensation
│   ├── hr/                 # Payroll, attendance
│   ├── staff/              # Doctors, departments, schedules
│   ├── audit/              # Middleware logs, KPI stream, PDF exports
│   ├── notifications/      # Signals-based WhatsApp/SMS alerts
│   └── config/             # Settings, URLs, WSGI
└── frontend/
    ├── src/
    │   ├── pages/          # All 18 page components
    │   ├── components/     # Sidebar, Layout, route guards
    │   ├── context/        # AuthContext (JWT + role state)
    │   └── utils/          # apiFetch helper, offlineDB
    └── public/
```

---

## 🗺️ Roadmap

- [x] Multi-role authentication with JWT
- [x] OPD, IPD, OT, Lab, Pharmacy, Billing modules
- [x] Branch Management & System Settings
- [x] Real-time audit logs & KPI telemetry
- [x] IndexedDB offline sync
- [ ] SUB_ADMIN role with branch isolation
- [ ] Reports & Analytics dashboard
- [ ] Appointment cancel / reschedule
- [ ] WhatsApp reminders via Twilio
- [ ] Railway + Vercel deployment
- [ ] Mobile app (React Native)

---

## 🤝 Acknowledgements

Architectural inspiration from the Clinic Management System design proposal by **Habiba Naveed** (Project Manager, PUCIT) — whose comprehensive DFDs, ERDs, and Class Diagrams served as the structural foundation for this project.

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.