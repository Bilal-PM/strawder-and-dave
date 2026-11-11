module.exports = { requestForegroundPermissionsAsync: async () => ({ status: "denied" }), getCurrentPositionAsync: async () => { throw new Error("no location in tests"); }, Accuracy: {} };
