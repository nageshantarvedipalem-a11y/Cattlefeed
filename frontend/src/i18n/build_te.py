# -*- coding: utf-8 -*-
"""Build te.json from unicode-escape fragments (ASCII-only source)."""
import json
from pathlib import Path

def L(s: str) -> str:
    return s.encode("utf-8").decode("unicode_escape")

te = {
    "app": {
        "name": L("\\u0c15\\u0c3e\\u0c1f\\u0c3f\\u0c32\\u0c4d \\u0c2b\\u0c40\\u0c21\\u0c4d ERP"),
        "tagline": L("\\u0c2b\\u0c40\\u0c21\\u0c4d \\u0c2c\\u0c3f\\u0c1c\\u0c3f\\u0c28\\u0c46\\u0c38\\u0c4d \\u0c38\\u0c42\\u0c1f\\u0c4d"),
        "language": L("\\u0c2d\\u0c3e\\u0c37"),
        "english": "English",
        "telugu": L("\\u0c24\\u0c46\\u0c32\\u0c41\\u0c17\\u0c41"),
    },
    "nav": {
        "dashboard": L("\\u0c21\\u0c3e\\u0c37\\u0c4d\\u200c\\u0c2c\\u0c4b\\u0c30\\u0c4d\\u0c21\\u0c4d"),
        "users": L("\\u0c35\\u0c3f\\u0c28\\u0c3f\\u0c2f\\u0c4b\\u0c17\\u0c26\\u0c3e\\u0c30\\u0c41\\u0c32\\u0c41"),
        "customers": L("\\u0c15\\u0c38\\u0c4d\\u0c1f\\u0c2e\\u0c30\\u0c4d\\u0c32\\u0c41"),
        "suppliers": L("\\u0c38\\u0c30\\u0c2b\\u0c30\\u0c3e\\u0c26\\u0c3e\\u0c30\\u0c41\\u0c32\\u0c41"),
        "products": L("\\u0c09\\u0c24\\u0c4d\\u0c2a\\u0c24\\u0c4d\\u0c24\\u0c41\\u0c32\\u0c41"),
        "stock": L("\\u0c38\\u0c4d\\u0c1f\\u0c3e\\u0c15\\u0c4d"),
        "billing": L("\\u0c2c\\u0c3f\\u0c32\\u0c4d\\u0c32\\u0c3f\\u0c02\\u0c17\\u0c4d"),
        "ledger": L("\\u0c32\\u0c46\\u0c21\\u0c4d\\u0c1c\\u0c30\\u0c4d"),
        "cashbook": L("\\u0c15\\u0c4d\\u0c2f\\u0c3e\\u0c37\\u0c4d \\u0c2c\\u0c41\\u0c15\\u0c4d"),
        "payments": L("\\u0c2a\\u0c46\\u0c02\\u0c21\\u0c3f\\u0c02\\u0c17\\u0c4d \\u0c1a\\u0c46\\u0c32\\u0c4d\\u0c32\\u0c3f\\u0c02\\u0c2a\\u0c41\\u0c32\\u0c41"),
        "profit": L("\\u0c32\\u0c3e\\u0c2d\\u0c02"),
        "reports": L("\\u0c30\\u0c3f\\u0c2a\\u0c4b\\u0c30\\u0c4d\\u0c1f\\u0c41\\u0c32\\u0c41"),
        "whatsapp": L("\\u0c35\\u0c3e\\u0c1f\\u0c4d\\u0c38\\u0c3e\\u0c2a\\u0c4d"),
        "profile": L("\\u0c28\\u0c3e \\u0c2a\\u0c4d\\u0c30\\u0c4a\\u0c2b\\u0c48\\u0c32\\u0c4d"),
        "logout": L("\\u0c32\\u0c3e\\u0c17\\u0c4d \\u0c05\\u0c35\\u0c41\\u0c1f\\u0c4d"),
        "newBill": L("\\u0c15\\u0c4a\\u0c24\\u0c4d\\u0c24 \\u0c2c\\u0c3f\\u0c32\\u0c4d\\u0c32\\u0c41"),
    },
    "common": {
        "search": L("\\u0c35\\u0c46\\u0c24\\u0c15\\u0c02\\u0c21\\u0c3f"),
        "save": L("\\u0c38\\u0c47\\u0c35\\u0c4d"),
        "cancel": L("\\u0c30\\u0c26\\u0c4d\\u0c26\\u0c41"),
        "close": L("\\u0c2e\\u0c42\\u0c38\\u0c3f\\u0c35\\u0c47\\u0c2f\\u0c3f"),
        "edit": L("\\u0c38\\u0c35\\u0c30\\u0c3f\\u0c02\\u0c1a\\u0c41"),
        "delete": L("\\u0c24\\u0c4a\\u0c32\\u0c17\\u0c3f\\u0c02\\u0c1a\\u0c41"),
        "add": L("\\u0c1c\\u0c4b\\u0c21\\u0c3f\\u0c02\\u0c1a\\u0c41"),
        "view": L("\\u0c1a\\u0c42\\u0c21\\u0c02\\u0c21\\u0c3f"),
        "print": L("\\u0c2a\\u0c4d\\u0c30\\u0c3f\\u0c02\\u0c1f\\u0c4d"),
        "export": L("\\u0c0e\\u0c17\\u0c41\\u0c2e\\u0c24\\u0c3f"),
        "excel": L("\\u0c0e\\u0c15\\u0c4d\\u0c38\\u0c46\\u0c32\\u0c4d"),
        "pdf": "PDF",
        "actions": L("\\u0c1a\\u0c30\\u0c4d\\u0c2f\\u0c32\\u0c41"),
        "status": L("\\u0c38\\u0c4d\\u0c25\\u0c3f\\u0c24\\u0c3f"),
        "date": L("\\u0c24\\u0c47\\u0c26\\u0c40"),
        "phone": L("\\u0c2b\\u0c4b\\u0c28\\u0c4d"),
        "name": L("\\u0c2a\\u0c47\\u0c30\\u0c41"),
        "amount": L("\\u0c2e\\u0c4a\\u0c24\\u0c4d\\u0c24\\u0c02"),
        "total": L("\\u0c2e\\u0c4a\\u0c24\\u0c4d\\u0c24\\u0c02"),
        "paid": L("\\u0c1a\\u0c46\\u0c32\\u0c4d\\u0c32\\u0c3f\\u0c02\\u0c1a\\u0c3f\\u0c28\\u0c26\\u0c3f"),
        "pending": L("\\u0c2c\\u0c15\\u0c3e\\u0c2f\\u0c3f"),
        "all": L("\\u0c05\\u0c28\\u0c4d\\u0c28\\u0c40"),
        "loading": L("\\u0c32\\u0c4b\\u0c21\\u0c4d \\u0c05\\u0c35\\u0c41\\u0c24\\u0c4b\\u0c02\\u0c26\\u0c3f..."),
        "noData": L("\\u0c21\\u0c47\\u0c1f\\u0c3e \\u0c32\\u0c47\\u0c26\\u0c41"),
        "back": L("\\u0c35\\u0c46\\u0c28\\u0c15\\u0c4d\\u0c15\\u0c3f"),
        "submit": L("\\u0c38\\u0c2e\\u0c30\\u0c4d\\u0c2a\\u0c3f\\u0c02\\u0c1a\\u0c41"),
        "confirm": L("\\u0c28\\u0c3f\\u0c30\\u0c4d\\u0c27\\u0c3e\\u0c30\\u0c3f\\u0c02\\u0c1a\\u0c41"),
        "yes": L("\\u0c05\\u0c35\\u0c41\\u0c28\\u0c41"),
        "no": L("\\u0c15\\u0c3e\\u0c26\\u0c41"),
        "filter": L("\\u0c2b\\u0c3f\\u0c32\\u0c4d\\u0c1f\\u0c30\\u0c4d"),
        "reset": L("\\u0c30\\u0c40\\u0c38\\u0c46\\u0c1f\\u0c4d"),
        "active": L("\\u0c2f\\u0c3e\\u0c15\\u0c4d\\u0c1f\\u0c3f\\u0c35\\u0c4d"),
        "inactive": L("\\u0c07\\u0c28\\u0c4d\\u200c\\u0c2f\\u0c3e\\u0c15\\u0c4d\\u0c1f\\u0c3f\\u0c35\\u0c4d"),
        "today": L("\\u0c08\\u0c30\\u0c4b\\u0c1c\\u0c41"),
        "yesterday": L("\\u0c28\\u0c3f\\u0c28\\u0c4d\\u0c28"),
        "thisWeek": L("\\u0c08 \\u0c35\\u0c3e\\u0c30\\u0c02"),
        "thisMonth": L("\\u0c08 \\u0c28\\u0c46\\u0c32"),
        "lastMonth": L("\\u0c17\\u0c24 \\u0c28\\u0c46\\u0c32"),
        "customRange": L("\\u0c15\\u0c38\\u0c4d\\u0c1f\\u0c2e\\u0c4d \\u0c30\\u0c47\\u0c02\\u0c1c\\u0c4d"),
        "from": L("\\u0c28\\u0c41\\u0c02\\u0c21\\u0c3f"),
        "to": L("\\u0c35\\u0c30\\u0c15\\u0c41"),
        "allTime": L("\\u0c05\\u0c28\\u0c4d\\u0c28\\u0c3f \\u0c15\\u0c3e\\u0c32\\u0c02"),
        "invoice": L("\\u0c07\\u0c28\\u0c4d\\u0c35\\u0c3e\\u0c2f\\u0c3f\\u0c38\\u0c4d"),
        "customer": L("\\u0c15\\u0c38\\u0c4d\\u0c1f\\u0c2e\\u0c30\\u0c4d"),
        "supplier": L("\\u0c38\\u0c30\\u0c2b\\u0c30\\u0c3e\\u0c26\\u0c3e\\u0c30\\u0c41"),
        "product": L("\\u0c09\\u0c24\\u0c4d\\u0c2a\\u0c24\\u0c4d\\u0c24\\u0c3f"),
        "quantity": L("\\u0c2a\\u0c30\\u0c3f\\u0c2e\\u0c3e\\u0c23\\u0c02"),
        "reference": L("\\u0c30\\u0c3f\\u0c2b\\u0c30\\u0c46\\u0c28\\u0c4d\\u0c38\\u0c4d"),
        "description": L("\\u0c35\\u0c3f\\u0c35\\u0c30\\u0c23"),
        "remarks": L("\\u0c35\\u0c4d\\u0c2f\\u0c3e\\u0c16\\u0c4d\\u0c2f\\u0c32\\u0c41"),
        "method": L("\\u0c35\\u0c3f\\u0c27\\u0c3e\\u0c28\\u0c02"),
        "source": L("\\u0c2e\\u0c42\\u0c32\\u0c02"),
        "category": L("\\u0c35\\u0c30\\u0c4d\\u0c17\\u0c02"),
        "party": L("\\u0c2a\\u0c3e\\u0c30\\u0c4d\\u0c1f\\u0c40"),
        "type": L("\\u0c30\\u0c15\\u0c02"),
        "balance": L("\\u0c2c\\u0c4d\\u0c2f\\u0c3e\\u0c32\\u0c46\\u0c28\\u0c4d\\u0c38\\u0c4d"),
        "receivePayment": L("\\u0c1a\\u0c46\\u0c32\\u0c4d\\u0c32\\u0c3f\\u0c02\\u0c2a\\u0c41 \\u0c38\\u0c4d\\u0c35\\u0c40\\u0c15\\u0c30\\u0c3f\\u0c02\\u0c1a\\u0c41"),
        "viewBill": L("\\u0c2c\\u0c3f\\u0c32\\u0c4d\\u0c32\\u0c41 \\u0c1a\\u0c42\\u0c21\\u0c02\\u0c21\\u0c3f"),
        "printBill": L("\\u0c2c\\u0c3f\\u0c32\\u0c4d\\u0c32\\u0c41 \\u0c2a\\u0c4d\\u0c30\\u0c3f\\u0c02\\u0c1f\\u0c4d"),
        "resendWhatsApp": L("\\u0c35\\u0c3e\\u0c1f\\u0c4d\\u0c38\\u0c3e\\u0c2a\\u0c4d \\u0c2e\\u0c33\\u0c4d\\u0c32\\u0c40 \\u0c2a\\u0c02\\u0c2a\\u0c41"),
        "exportFailed": L("\\u0c0e\\u0c17\\u0c41\\u0c2e\\u0c24\\u0c3f \\u0c35\\u0c3f\\u0c2b\\u0c32\\u0c2e\\u0c48\\u0c02\\u0c26\\u0c3f"),
        "invalidDateRange": L("\\u0c24\\u0c47\\u0c26\\u0c40 \\u0c2a\\u0c30\\u0c3f\\u0c27\\u0c3f \\u0c1a\\u0c46\\u0c32\\u0c4d\\u0c32\\u0c26\\u0c41"),
        "selectCustomDates": L("\\u0c15\\u0c38\\u0c4d\\u0c1f\\u0c2e\\u0c4d \\u0c30\\u0c47\\u0c02\\u0c1c\\u0c4d \\u0c15\\u0c4b\\u0c38\\u0c02 \\u0c28\\u0c41\\u0c02\\u0c21\\u0c3f/\\u0c35\\u0c30\\u0c15\\u0c41 \\u0c24\\u0c47\\u0c26\\u0c40\\u0c32\\u0c41 \\u0c0e\\u0c02\\u0c1a\\u0c41\\u0c15\\u0c4b\\u0c02\\u0c21\\u0c3f"),
        "loggedOut": L("\\u0c35\\u0c3f\\u0c1c\\u0c2f\\u0c35\\u0c02\\u0c24\\u0c02\\u0c17\\u0c3e \\u0c32\\u0c3e\\u0c17\\u0c4d \\u0c05\\u0c35\\u0c41\\u0c1f\\u0c4d \\u0c05\\u0c2f\\u0c4d\\u0c2f\\u0c3e\\u0c30\\u0c41"),
        "logoutFailed": L("\\u0c32\\u0c3e\\u0c17\\u0c4d \\u0c05\\u0c35\\u0c41\\u0c1f\\u0c4d \\u0c35\\u0c3f\\u0c2b\\u0c32\\u0c2e\\u0c48\\u0c02\\u0c26\\u0c3f"),
        "changePassword": L("\\u0c2a\\u0c3e\\u0c38\\u0c4d\\u200c\\u0c35\\u0c30\\u0c4d\\u0c21\\u0c4d \\u0c2e\\u0c3e\\u0c30\\u0c4d\\u0c1a\\u0c02\\u0c21\\u0c3f"),
        "owner": L("\\u0c2f\\u0c1c\\u0c2e\\u0c3e\\u0c28\\u0c3f"),
        "admin": L("\\u0c05\\u0c21\\u0c4d\\u0c2e\\u0c3f\\u0c28\\u0c4d"),
        "staff": L("\\u0c38\\u0c3f\\u0c2c\\u0c4d\\u0c2c\\u0c02\\u0c26\\u0c3f"),
    },
}

# Merge remaining modules from en.json keys with Telugu overlays
ROOT = Path(__file__).resolve().parent
en = json.loads((ROOT / "locales" / "en.json").read_text(encoding="utf-8"))

# For any missing nested keys, keep English as temporary fallback then overlay known modules
modules = {
    "auth": {
        "welcomeBack": L("\\u0c2e\\u0c33\\u0c4d\\u0c32\\u0c40 \\u0c38\\u0c4d\\u0c35\\u0c3e\\u0c17\\u0c24\\u0c02"),
        "signInTitle": L("\\u0c2e\\u0c40 \\u0c16\\u0c3e\\u0c24\\u0c3e\\u0c32\\u0c4b\\u0c15\\u0c3f \\u0c38\\u0c48\\u0c28\\u0c4d \\u0c07\\u0c28\\u0c4d \\u0c05\\u0c35\\u0c4d\\u0c35\\u0c02\\u0c21\\u0c3f"),
        "signInSubtitle": L("\\u0c2e\\u0c40 \\u0c2b\\u0c40\\u0c21\\u0c4d \\u0c35\\u0c4d\\u0c2f\\u0c3e\\u0c2a\\u0c3e\\u0c30\\u0c02 \\u0c15\\u0c4b\\u0c38\\u0c02 \\u0c05\\u0c2e\\u0c4d\\u0c2e\\u0c15\\u0c3e\\u0c32\\u0c41, \\u0c38\\u0c4d\\u0c1f\\u0c3e\\u0c15\\u0c4d \\u0c2e\\u0c30\\u0c3f\\u0c2f\\u0c41 \\u0c16\\u0c3e\\u0c24\\u0c3e\\u0c32\\u0c28\\u0c41 \\u0c28\\u0c3f\\u0c30\\u0c4d\\u0c35\\u0c39\\u0c3f\\u0c02\\u0c1a\\u0c02\\u0c21\\u0c3f"),
        "usernameOrEmail": L("\\u0c2f\\u0c42\\u0c1c\\u0c30\\u0c4d\\u200c\\u0c28\\u0c47\\u0c2e\\u0c4d \\u0c32\\u0c47\\u0c26\\u0c3e \\u0c07\\u0c2e\\u0c46\\u0c2f\\u0c3f\\u0c32\\u0c4d"),
        "password": L("\\u0c2a\\u0c3e\\u0c38\\u0c4d\\u200c\\u0c35\\u0c30\\u0c4d\\u0c21\\u0c4d"),
        "signIn": L("\\u0c38\\u0c48\\u0c28\\u0c4d \\u0c07\\u0c28\\u0c4d"),
        "forgotPassword": L("\\u0c2a\\u0c3e\\u0c38\\u0c4d\\u200c\\u0c35\\u0c30\\u0c4d\\u0c21\\u0c4d \\u0c2e\\u0c30\\u0c4d\\u0c1a\\u0c3f\\u0c2a\\u0c4b\\u0c2f\\u0c3e\\u0c30\\u0c3e?"),
        "heroTitle": L("\\u0c2e\\u0c40 \\u0c15\\u0c3e\\u0c1f\\u0c3f\\u0c32\\u0c4d \\u0c2b\\u0c40\\u0c21\\u0c4d \\u0c35\\u0c4d\\u0c2f\\u0c3e\\u0c2a\\u0c3e\\u0c30\\u0c3e\\u0c28\\u0c3f\\u0c15\\u0c3f \\u0c38\\u0c4d\\u0c2e\\u0c3e\\u0c30\\u0c4d\\u0c1f\\u0c4d \\u0c28\\u0c3f\\u0c30\\u0c4d\\u0c35\\u0c39\\u0c23"),
        "heroSubtitle": L("\\u0c2c\\u0c3f\\u0c32\\u0c4d\\u0c32\\u0c3f\\u0c02\\u0c17\\u0c4d, \\u0c07\\u0c28\\u0c4d\\u0c35\\u0c46\\u0c02\\u0c1f\\u0c30\\u0c40, \\u0c32\\u0c46\\u0c21\\u0c4d\\u0c1c\\u0c30\\u0c4d, \\u0c1a\\u0c46\\u0c32\\u0c4d\\u0c32\\u0c3f\\u0c02\\u0c2a\\u0c41\\u0c32\\u0c41 \\u0c2e\\u0c30\\u0c3f\\u0c2f\\u0c41 \\u0c32\\u0c3e\\u0c2d\\u0c02 \\u2014 \\u0c2e\\u0c40 \\u0c2b\\u0c40\\u0c21\\u0c4d \\u0c37\\u0c3e\\u0c2a\\u0c4d \\u0c28\\u0c21\\u0c2a\\u0c21\\u0c3e\\u0c28\\u0c3f\\u0c15\\u0c3f \\u0c05\\u0c35\\u0c38\\u0c30\\u0c2e\\u0c48\\u0c28\\u0c35\\u0c28\\u0c4d\\u0c28\\u0c40 \\u0c12\\u0c15\\u0c47 \\u0c21\\u0c3e\\u0c37\\u0c4d\\u200c\\u0c2c\\u0c4b\\u0c30\\u0c4d\\u0c21\\u0c4d\\u200c\\u0c32\\u0c4b."),
        "featureBilling": L("\\u0c05\\u0c2e\\u0c4d\\u0c2e\\u0c15\\u0c3e\\u0c32\\u0c41 & \\u0c2c\\u0c3f\\u0c32\\u0c4d\\u0c32\\u0c3f\\u0c02\\u0c17\\u0c4d"),
        "featureBillingDesc": L("\\u0c2b\\u0c40\\u0c21\\u0c4d \\u0c06\\u0c30\\u0c4d\\u0c21\\u0c30\\u0c4d\\u0c32\\u0c15\\u0c41 \\u0c35\\u0c47\\u0c17\\u0c35\\u0c02\\u0c24\\u0c2e\\u0c48\\u0c28 \\u0c07\\u0c28\\u0c4d\\u0c35\\u0c3e\\u0c2f\\u0c3f\\u0c38\\u0c4d"),
        "featureStock": L("\\u0c38\\u0c4d\\u0c1f\\u0c3e\\u0c15\\u0c4d \\u0c28\\u0c3f\\u0c2f\\u0c02\\u0c24\\u0c4d\\u0c30\\u0c23"),
        "featureStockDesc": L("\\u0c2c\\u0c4d\\u0c2f\\u0c3e\\u0c17\\u0c41\\u0c32\\u0c41, \\u0c2a\\u0c46\\u0c32\\u0c4d\\u0c32\\u0c46\\u0c1f\\u0c4d\\u0c32\\u0c41 & \\u0c07\\u0c28\\u0c4d\\u0c35\\u0c46\\u0c02\\u0c1f\\u0c30\\u0c40 \\u0c1f\\u0c4d\\u0c30\\u0c3e\\u0c15\\u0c4d"),
        "featurePurchase": L("\\u0c15\\u0c4a\\u0c28\\u0c41\\u0c17\\u0c4b\\u0c32\\u0c41 \\u0c28\\u0c3f\\u0c30\\u0c4d\\u0c35\\u0c39\\u0c23"),
        "featurePurchaseDesc": L("\\u0c38\\u0c30\\u0c2b\\u0c30\\u0c3e\\u0c26\\u0c3e\\u0c30\\u0c41 & \\u0c15\\u0c4a\\u0c28\\u0c41\\u0c17\\u0c4b\\u0c32\\u0c41 \\u0c30\\u0c3f\\u0c15\\u0c3e\\u0c30\\u0c4d\\u0c21\\u0c41\\u0c32\\u0c41"),
        "featureProfit": L("\\u0c32\\u0c3e\\u0c2d\\u0c02 & \\u0c30\\u0c3f\\u0c2a\\u0c4b\\u0c30\\u0c4d\\u0c1f\\u0c41\\u0c32\\u0c41"),
        "featureProfitDesc": L("\\u0c30\\u0c3f\\u0c2f\\u0c32\\u0c4d \\u0c1f\\u0c48\\u0c2e\\u0c4d \\u0c35\\u0c4d\\u0c2f\\u0c3e\\u0c2a\\u0c3e\\u0c30 \\u0c05\\u0c02\\u0c24\\u0c30\\u0c4d\\u0c26\\u0c43\\u0c37\\u0c4d\\u0c1f\\u0c41\\u0c32\\u0c41"),
        "trustedBy": L("\\u0c2b\\u0c40\\u0c21\\u0c4d \\u0c21\\u0c40\\u0c32\\u0c30\\u0c4d\\u0c32\\u0c41, \\u0c21\\u0c3f\\u0c38\\u0c4d\\u0c1f\\u0c4d\\u0c30\\u0c3f\\u0c2c\\u0c4d\\u0c2f\\u0c42\\u0c1f\\u0c30\\u0c4d\\u0c32\\u0c41 & \\u0c2b\\u0c3e\\u0c30\\u0c4d\\u0c2e\\u0c4d \\u0c38\\u0c2a\\u0c4d\\u0c32\\u0c2f\\u0c30\\u0c4d\\u0c32\\u0c41 \\u0c35\\u0c3f\\u0c36\\u0c4d\\u0c35\\u0c38\\u0c3f\\u0c02\\u0c1a\\u0c47 \\u0c38\\u0c3f\\u0c38\\u0c4d\\u0c1f\\u0c2e\\u0c4d"),
        "footer": L("\\u0c07\\u0c28\\u0c4d\\u0c35\\u0c46\\u0c02\\u0c1f\\u0c30\\u0c40 & \\u0c2c\\u0c3f\\u0c32\\u0c4d\\u0c32\\u0c3f\\u0c02\\u0c17\\u0c4d \\u0c38\\u0c3f\\u0c38\\u0c4d\\u0c1f\\u0c2e\\u0c4d | Designed by The Website Makers"),
    },
}

# Import rest from build_te_rest if present
rest_path = ROOT / "build_te_rest.py"
if rest_path.exists():
    ns = {}
    exec(rest_path.read_text(encoding="utf-8"), ns)
    modules.update(ns.get("MODULES", {}))

te.update(modules)

# Fill any missing keys from English so structure always matches
def merge_missing(dst, src):
    for k, v in src.items():
        if k not in dst:
            dst[k] = v
        elif isinstance(v, dict) and isinstance(dst[k], dict):
            merge_missing(dst[k], v)

merge_missing(te, en)

out = ROOT / "locales" / "te.json"
out.write_text(json.dumps(te, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print("wrote", out, "nav.dashboard=", te["nav"]["dashboard"])
