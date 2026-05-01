import React, { useState } from "react";
import { Layers, ArrowRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";

const Register = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/auth/register', { email, password });
      if (res.data.access_token) {
        localStorage.setItem('access_token', res.data.access_token);
        localStorage.setItem('refresh_token', res.data.refresh_token);
        navigate("/");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to register');
    }
  };

  return (
    <div className="min-h-screen bg-main flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 text-primary-600 font-bold text-2xl tracking-tight mb-8">
          <div className="w-10 h-10 rounded-lg bg-primary-600 flex items-center justify-center">
            <Layers className="w-6 h-6 text-white" />
          </div>
          ModelOps AI
        </div>

        <div className="card shadow-md">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Create an account
          </h1>
          <p className="text-slate-500 mb-6">
            Start deploying your machine learning models today.
          </p>

          {error && <div className="mb-4 p-3 rounded-lg bg-red-100 text-red-700 text-sm font-medium">{error}</div>}

          <form onSubmit={handleRegister} className="space-y-5">
            <div>
              <label className="form-label text-xs">Full Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="Jane Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="form-label text-xs">Email Address</label>
              <input
                type="email"
                className="form-input"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="form-label text-xs">Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn-primary w-full py-2.5 flex justify-center mt-2"
            >
              Create Account <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          Already have an account?{" "}
          <Link
            to="/auth/login"
            className="font-bold text-primary-600 hover:text-primary-700"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
