#pragma once

// Copy to CloudConfig.local.h on the preparation computer only. The local
// file is ignored by Git. Leave CLOUD_ENABLED false until registration and
// backend deployment are complete; never paste credentials into this example.
#define CLOUD_ENABLED false
#define CLOUD_WIFI_SSID ""
#define CLOUD_WIFI_PASSWORD ""
#define CLOUD_DEVICE_ID ""
#define CLOUD_DEVICE_KEY ""
#define CLOUD_ENDPOINT "https://REPLACE_WITH_PREVIEW_HOST/api/v2/device/readings"

// PEM root certificate for the endpoint's currently validated trust chain.
// Provision and test it at installation. Do not use setInsecure().
static const char CLOUD_ROOT_CA[] = R"MYKO(-----BEGIN CERTIFICATE-----
REPLACE_WITH_VALID_ROOT_CA
-----END CERTIFICATE-----)MYKO";
