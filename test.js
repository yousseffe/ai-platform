const url = "http://localhost:3000/api/v1/models/ec442e23-f353-45f8-8f08-978a656dc020/v1/predict";
const payload = {
  "feature_0": 0.0,
  "feature_1": 0.0,
  "feature_2": 0.0,
  "feature_3": 0.0
};

const response = await fetch(url, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer ml_sk_live_4f83dde935dce9f592b1d382d26e5c0fc7449ce8413fbdb1"
  },
  body: JSON.stringify(payload)
});

const result = await response.json();
console.log(result);