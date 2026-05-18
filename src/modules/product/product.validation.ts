import { body, param, query, validationResult } from "express-validator";
import { Request, Response, NextFunction } from "express";

// ─── Reusable validation result handler ───────────────────────────────────────
export function handleValidationErrors(
    req: Request,
    res: Response,
    next: NextFunction
): void {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.status(400).json({
            success: false,
            message: "Validation failed",
            errors: errors.array().map((e) => ({
                field: e.type === "field" ? e.path : "unknown",
                message: e.msg,
            })),
        });
        return;
    }
    next();
}

// ─── Create product rules ─────────────────────────────────────────────────────
export const createProductRules = [
    body("name")
        .trim()
        .notEmpty().withMessage("Name is required")
        .isLength({ min: 2, max: 255 }).withMessage("Name must be 2–255 characters"),

    body("description")
        .trim()
        .notEmpty().withMessage("Description is required")
        .isLength({ min: 10 }).withMessage("Description must be at least 10 characters"),

    body("price")
        .notEmpty().withMessage("Price is required")
        .isFloat({ min: 0 }).withMessage("Price must be a positive number"),

    body("stock")
        .notEmpty().withMessage("Stock is required")
        .isInt({ min: 0 }).withMessage("Stock must be a non-negative integer"),

    body("category")
        .trim()
        .notEmpty().withMessage("Category is required")
        .isLength({ min: 2, max: 100 }).withMessage("Category must be 2–100 characters"),

    body("imageUrl")
        .optional()
        .isURL().withMessage("Image URL must be a valid URL"),

    handleValidationErrors,
];

// ─── Update product rules (all fields optional) ───────────────────────────────
export const updateProductRules = [
    param("id")
        .isInt({ min: 1 }).withMessage("Product ID must be a positive integer"),

    body("name")
        .optional()
        .trim()
        .isLength({ min: 2, max: 255 }).withMessage("Name must be 2–255 characters"),

    body("description")
        .optional()
        .trim()
        .isLength({ min: 10 }).withMessage("Description must be at least 10 characters"),

    body("price")
        .optional()
        .isFloat({ min: 0 }).withMessage("Price must be a positive number"),

    body("stock")
        .optional()
        .isInt({ min: 0 }).withMessage("Stock must be a non-negative integer"),

    body("category")
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 }).withMessage("Category must be 2–100 characters"),

    body("imageUrl")
        .optional()
        .isURL().withMessage("Image URL must be a valid URL"),

    handleValidationErrors,
];

// ─── ID param rule ────────────────────────────────────────────────────────────
export const idParamRules = [
    param("id")
        .isInt({ min: 1 }).withMessage("Product ID must be a positive integer"),
    handleValidationErrors,
];

// ─── List query rules ─────────────────────────────────────────────────────────
export const listQueryRules = [
    query("page")
        .optional()
        .isInt({ min: 1 }).withMessage("Page must be a positive integer"),

    query("limit")
        .optional()
        .isInt({ min: 1, max: 100 }).withMessage("Limit must be between 1 and 100"),

    query("minPrice")
        .optional()
        .isFloat({ min: 0 }).withMessage("minPrice must be a positive number"),

    query("maxPrice")
        .optional()
        .isFloat({ min: 0 }).withMessage("maxPrice must be a positive number"),

    handleValidationErrors,
];