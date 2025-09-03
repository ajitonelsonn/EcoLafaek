// pages/under-construction.js
import { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import ModernLayout from "../components/Layout";
import {
  Construction,
  ArrowLeft,
  Mail,
  ExternalLink,
  Bell,
  Check,
} from "lucide-react";

export default function UnderConstruction() {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Handle email notification signup
  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      setIsSubmitted(true);
      setEmail("");
    }, 1500);
  };

  return (
    <ModernLayout>
      <Head>
        <title>Coming Soon | EcoLafaek</title>
        <meta
          name="description"
          content="This feature is coming soon to EcoLafaek - the AI-powered waste management platform for Timor-Leste"
        />
      </Head>

      <div className="min-h-[calc(100vh-300px)] flex items-center justify-center bg-gradient-to-b from-emerald-50 to-white py-16">
        <div className="max-w-4xl mx-auto px-6">
          {/* Main Content Card */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            {/* Header Section */}
            <div className="bg-emerald-600 py-8 px-8 text-white text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-full opacity-10">
                <div className="absolute -left-10 -top-10 w-40 h-40 rounded-full bg-white"></div>
                <div className="absolute -right-10 -bottom-10 w-40 h-40 rounded-full bg-white"></div>
              </div>

              <div className="relative z-10">
                <div className="mb-4 inline-flex items-center justify-center p-2 bg-white bg-opacity-20 backdrop-blur-sm rounded-full">
                  <Construction className="h-10 w-10 text-white" />
                </div>

                <h1 className="text-3xl md:text-4xl font-bold mb-3">
                  Feature Coming Soon
                </h1>

                <p className="text-lg text-emerald-50 max-w-2xl mx-auto">
                  We're working on something special to enhance your EcoLafaek
                  experience. Our team is actively building this feature to make
                  waste management in Timor-Leste even more effective.
                </p>
              </div>
            </div>

            {/* Get Notified Section */}
            <div className="py-8 px-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 text-center">
                Get Notified When We Launch
              </h2>

              <div className="max-w-md mx-auto">
                {!isSubmitted ? (
                  <form
                    onSubmit={handleSubmit}
                    className="flex flex-col sm:flex-row gap-3"
                  >
                    <div className="relative flex-grow">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email address"
                        className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className={`px-5 py-2.5 rounded-lg font-medium shadow-sm flex items-center justify-center ${
                        isLoading
                          ? "bg-emerald-300 text-white"
                          : "bg-emerald-600 text-white hover:bg-emerald-700"
                      } transition-colors sm:whitespace-nowrap`}
                    >
                      {isLoading ? (
                        <>
                          <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                          Processing...
                        </>
                      ) : (
                        <>
                          <Bell className="h-4 w-4 mr-2" />
                          Notify Me
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-start">
                    <Check className="h-5 w-5 text-emerald-600 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      <h3 className="font-medium text-emerald-800">
                        Thanks for subscribing!
                      </h3>
                      <p className="text-sm text-emerald-700 mt-1">
                        We'll send you an email as soon as this feature becomes
                        available.
                      </p>
                    </div>
                  </div>
                )}

                <p className="text-xs text-gray-500 mt-3 text-center">
                  We respect your privacy and will never share your email
                  address.
                </p>
              </div>
            </div>

            {/* Status Message */}
            <div className="py-8 px-6 border-b border-gray-100">
              <div className="flex flex-col items-center justify-center text-center max-w-2xl mx-auto">
                <div className="bg-amber-50 rounded-lg p-6 w-full border border-amber-100">
                  <h3 className="font-medium text-amber-800 text-lg mb-2">
                    Development Status
                  </h3>
                  <p className="text-amber-700">
                    This feature is currently in active development. We'll be
                    launching soon with initial functionality, and we'll
                    continue to add more capabilities over time.
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="py-8 px-6 text-center">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/"
                  className="inline-flex items-center px-5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Link>

                <Link
                  href="/download"
                  className="inline-flex items-center px-5 py-2.5 bg-emerald-600 border border-transparent rounded-lg text-white hover:bg-emerald-700 transition-colors shadow-sm"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Download Mobile App
                </Link>
              </div>

              <p className="mt-6 text-sm text-gray-500">
                Have questions or suggestions?{" "}
                <Link
                  href="/about"
                  className="text-emerald-600 hover:text-emerald-800"
                >
                  Contact our team
                </Link>
              </p>
            </div>
          </div>

          {/* Logos and Partnerships */}
          <div className="mt-12 text-center">
            <p className="text-sm font-medium text-gray-500 mb-4">
              Proudly developed by
            </p>
            <div className="flex justify-center items-center">
              <div className="mx-4">
                <Image
                  src="/app_logo.png"
                  alt="EcoLafaek Logo"
                  width={40}
                  height={40}
                  className="inline-block"
                />
                <span className="ml-2 font-bold text-emerald-700">
                  EcoLafaek
                </span>
              </div>
              <div className="mx-4">
                <span className="text-gray-600 font-medium">
                  Lafaek AI Team
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ModernLayout>
  );
}
