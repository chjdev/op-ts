module.exports = {
  roots: ["packages"],
  testMatch: ["**/__tests__/**/*.ts?(x)"],
  transform: {
    "^.+\\.tsx?$": "ts-jest",
  },
};
