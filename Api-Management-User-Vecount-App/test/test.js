const request = require("supertest");
const { createClient } = require("@supabase/supabase-js");
const { io } = require("socket.io-client");
const app = require("../app"); // Aplikasi Express.js
const supabase = createClient("https://amaqbnkiloahavwazcpa.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtYXFibmtpbG9haGF2d2F6Y3BhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzMxNzE3NjEsImV4cCI6MjA0ODc0Nzc2MX0.gUCiYxnKfK_21gKktM0HGmIlkpyaZazZNx0zULMAo6U"); // Sesuaikan dengan Supabase Anda

let userToken = "";
let adminToken = "";

describe("User Management API Tests", () => {
  beforeAll(async () => {
    // Setup initial data for testing
    await supabase.from("users").delete().neq("id", "");
  });

  test("Register a new user with OTP", async () => {
    const response = await request(app).post("/api/register").send({
      fullName: "John Doe",
      email: "john.doe@example.com",
      password: "password123",
      phone: "08123456789",
      role: "user",
      bio: "Hello, I am John.",
    });
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("otp");
  });

  test("Activate user account using OTP", async () => {
    const { data } = await supabase
      .from("users")
      .select("otp")
      .eq("email", "john.doe@example.com")
      .single();

    const response = await request(app).post("/api/activate").send({
      email: "john.doe@example.com",
      otp: data.otp,
    });
    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Account activated successfully");
  });

  test("Login as a user", async () => {
    const response = await request(app).post("/api/login").send({
      email: "john.doe@example.com",
      password: "password123",
    });
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("token");
    userToken = response.body.token; // Simpan token untuk user
  });

  test("Admin registers another user", async () => {
    const response = await request(app).post("/api/register").send({
      fullName: "Admin User",
      email: "admin@example.com",
      password: "admin123",
      phone: "08198765432",
      role: "admin",
      bio: "Admin account.",
    });
    expect(response.status).toBe(201);

    // Activate admin account
    const { data } = await supabase
      .from("users")
      .select("otp")
      .eq("email", "admin@example.com")
      .single();
    await request(app).post("/api/activate").send({
      email: "admin@example.com",
      otp: data.otp,
    });

    // Login as admin
    const loginResponse = await request(app).post("/api/login").send({
      email: "admin@example.com",
      password: "admin123",
    });
    expect(loginResponse.status).toBe(200);
    adminToken = loginResponse.body.token; // Simpan token untuk admin
  });

  test("User retrieves all users (online/offline)", async () => {
    const response = await request(app)
      .get("/api/users")
      .set("Authorization", `Bearer ${userToken}`);
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("users");
    expect(Array.isArray(response.body.users)).toBe(true);
  });

  test("Admin edits a user profile", async () => {
    const { data } = await supabase
      .from("users")
      .select("id")
      .eq("email", "john.doe@example.com")
      .single();

    const response = await request(app)
      .put(`/api/users/${data.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        fullName: "John Updated Doe",
        bio: "Updated bio by admin.",
      });
    expect(response.status).toBe(200);
    expect(response.body.message).toBe("User updated successfully");
  });

  test("Admin deletes a user", async () => {
    const { data } = await supabase
      .from("users")
      .select("id")
      .eq("email", "john.doe@example.com")
      .single();

    const response = await request(app)
      .delete(`/api/users/${data.id}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(response.status).toBe(200);
    expect(response.body.message).toBe("User deleted successfully");
  });

  test("Real-time user online status", (done) => {
    const socket = io("http://localhost:3000", {
      auth: {
        token: userToken,
      },
    });

    socket.on("connect", () => {
      socket.on("user-status", (statusUpdate) => {
        expect(statusUpdate).toHaveProperty("userId");
        expect(statusUpdate).toHaveProperty("status");
        expect(statusUpdate.status).toBe("online");
        socket.disconnect();
        done();
      });
    });
  });
});

