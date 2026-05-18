import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../../config/database";

export interface ProductAttributes {
    id: number;
    name: string;
    description: string;
    price: number;
    stock: number;
    category: string;
    imageUrl?: string;
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface ProductCreationAttributes
    extends Optional<ProductAttributes, "id" | "imageUrl" | "isActive"> { }

class Product
    extends Model<ProductAttributes, ProductCreationAttributes>
    implements ProductAttributes {
    public id!: number;
    public name!: string;
    public description!: string;
    public price!: number;
    public stock!: number;
    public category!: string;
    public imageUrl?: string;
    public isActive!: boolean;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

Product.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        price: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
        },
        stock: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        category: {
            type: DataTypes.STRING(100),
            allowNull: false,
        },
        imageUrl: {
            type: DataTypes.STRING(500),
            allowNull: true,
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
    },
    {
        sequelize,
        tableName: "products",
        timestamps: true,
    }
);

export default Product;