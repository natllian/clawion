import { z } from "zod";

export const schemaVersionSchema = z.literal(1);
export const idSchema = z.string().min(1);
export const nonEmptyTextSchema = z.string().min(1);
export const isoDateSchema = z.string().min(1);
