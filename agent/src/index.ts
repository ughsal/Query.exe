import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";

import { searchRouter } from "./routes/search_lcel";

const app = express();

app.set("trust proxy", 1);

app.use(helmet());

app.use(
  cors({
    origin: process.env.ALLOWED_ORIGIN,
  }),
);

app.use(express.json({ limit: "10kb" }));

app.use("/search", searchRouter);

app.use((err: any, req: any, res: any, next: any) => {
  console.error(err);

  res.status(500).json({
    error: "Internal server error",
  });
});

const port = Number(process.env.PORT ?? 5174);

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
