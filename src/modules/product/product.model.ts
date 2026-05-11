import { DataTypes, Model } from "sequelize";
import sequelize from "../../config/database";
import { UUID } from "node:crypto";

class Product extends Model {
    declare id: UUID;
    declare name: string;
    declare description: string;
    declare vision: string;
    declare problemStatement: string;
    declare ownerId: UUID;
    declare organizationId: UUID;
    declare tags: string[]; // Assuming tags are stored as an array of strings
    declare status: string;
    declare createdAt: Date;
    declare updatedAt: Date;
}   

Product.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,   
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        vision: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        problemStatement: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        ownerId: {
            type: DataTypes.UUID,
            allowNull: false,   
        },
        organizationId: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        tags: {
            type: DataTypes.ARRAY(DataTypes.STRING),
            allowNull: true,
        },
        status: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        updatedAt: {
            type: DataTypes.DATE,
            allowNull: false,
        },
    },
    {   
        sequelize,
        modelName: "Product",
    }
);

export default Product;