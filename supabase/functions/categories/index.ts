import { Hono } from "jsr:@hono/hono";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { cors } from "jsr:@hono/hono/cors";
import type { HonoContext } from "../_shared/types.js";

const app = new Hono();

// Configure CORS
app.use(
  "/*",
  cors({
    origin: [
      "http://localhost:3000",
      "https://event-hub-frontend-five.vercel.app",
    ], // Add your domains
    credentials: true,
  })
);

// Initialize Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Get all categories
app.get("/categories", async (c: HonoContext) => {
  try {
    console.log("Fetching categories...");

    const { data: categories, error } = await supabase
      .from("event_categories")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      console.error("Supabase error:", error);
      throw new Error(`Failed to fetch categories: ${error.message}`);
    }

    console.log(`Found ${categories?.length} categories`);
    return c.json({ categories });
  } catch (error) {
    console.error("Categories fetch error:", error);
    return c.json({ error: "Failed to fetch categories" }, 500);
  }
});

Deno.serve(app.fetch);
