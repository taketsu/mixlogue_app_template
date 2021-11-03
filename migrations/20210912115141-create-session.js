"use strict";
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("Sessions", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      sessionId: {
        type: Sequelize.STRING,
      },
      shop: {
        type: Sequelize.STRING,
      },
      accessToken: {
        type: Sequelize.STRING,
      },
      sessionBody: {
        type: Sequelize.TEXT,
      },
      deletedAt: {
        type: Sequelize.DATE,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });
    await queryInterface.addIndex("Sessions", ["sessionId"], {
      indexName: "index_sessionId",
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex("Sessions", "index_sessionId");
    await queryInterface.dropTable("Sessions");
  },
};
