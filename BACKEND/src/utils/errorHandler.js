// import { Request, Response, NextFunction } from "express";
// import { AppError } from "../errors/AppError";

export const errorHandler = (err, req, res, next) => {
    if(err instanceof AppError){
        return res.status(err.statusCode).json({
            success: false,
            message: err.message,
        });
    }
    
    // console.error(err);
    res.status(500).json({
        success: false,
        message:  err.message || "internal server error",
    });
};


export class AppError extends Error{
    statusCode;
    isOperational;

    constructor(message, statusCode = 500, isOperational = true){
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        Error.captureStackTrace(this, this.constructor);
    }
};

export class NotFoundError extends AppError{
    constructor(message = "resource not found"){
        super(message, 404);
    }
};

export class ConflictError extends AppError{
    constructor(message = "conflict occurred"){
        super(message, 400);
    }
};

export class BadRequestError extends AppError{
    constructor(message = "bad request"){
        super(message, 400);
    }
};

export class UnauthorizedError extends AppError{
    constructor(message = "unauthorized"){
        super(message, 401);
    }
};

