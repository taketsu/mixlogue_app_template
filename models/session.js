"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Session extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Session.init(
    {
      sessionId: DataTypes.STRING,
      shop: DataTypes.STRING,
      accessToken: DataTypes.STRING,
      sessionBody: DataTypes.TEXT,
    },
    {
      sequelize,
      modelName: "Session",
      paranoid: true,
    }
  );
  return Session;
};
