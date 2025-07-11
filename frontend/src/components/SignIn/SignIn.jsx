import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import "./SignIn.css";

const SignIn = ({ setUserEmail, setIsLoggedIn }) => {
  const [username, setUsername] = useState(""); // username instead of email
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await axios.post("http://127.0.0.1:8000/api/users/login/", {
        username,
        password,
      });

      console.log("✅ Login Success:", response.data);

      const { access, refresh, user } = response.data;

      // 🧠 Store tokens and user in localStorage
      localStorage.setItem("access_token", access);
      localStorage.setItem("refresh_token", refresh);
      localStorage.setItem("user", JSON.stringify(user));

      // 🎯 Update parent state
      if (setUserEmail) {
        setUserEmail(user.email);
      }

      if (setIsLoggedIn) {
        setIsLoggedIn(true);
      }

      // ✅ Navigate to home (no /after now)
      navigate("/");

    } catch (error) {
      console.error("❌ Login Error:", error.response?.data || error);
      alert("❌ Login failed: " + (error.response?.data?.detail || "Please check your credentials"));
    }
  };

  return (
    <div className="signin-container">
      <form className="signin-form" onSubmit={handleSubmit}>
        <h2>Sign In</h2>

        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button type="submit">Sign In</button>

        <Link to="/forgot-password" className="forgot-link">
          Forgot Password?
        </Link>
      </form>
    </div>
  );
};

export default SignIn;
