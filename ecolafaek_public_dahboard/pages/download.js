// pages/download.js
import { useState } from "react";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import ModernLayout from "../components/Layout";
import {
  Download,
  Smartphone,
  Camera,
  MapPin,
  Trash2,
  CheckCircle,
  ChevronRight,
  ArrowDown,
  X,
  Info,
} from "lucide-react";

export default function DownloadApp() {
  const [activeTab, setActiveTab] = useState("android"); // 'android' or 'ios'
  const [showIosModal, setShowIosModal] = useState(false);

  // App download links
  const downloadLinks = {
    android: "https://bit.ly/ecolafaek",
    ios: "/uc",
    direct: "https://bit.ly/ecolafaek",
  };

  return (
    <ModernLayout>
      <Head>
        <title>Download App | EcoLafaek</title>
        <meta
          name="description"
          content="Download the EcoLafaek mobile application for waste monitoring in Timor-Leste"
        />
      </Head>

      <div className="bg-gradient-to-b from-emerald-50 to-white pt-16 pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Download the EcoLafaek App
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Help keep Timor-Leste clean by reporting waste incidents from your
              mobile device
            </p>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left side - QR Code and Download Links */}
            <div className="bg-white rounded-xl shadow-sm p-8 text-center">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Scan QR Code to Download
                </h2>
                <p className="text-gray-600 mb-6">
                  Use your phone's camera to scan this QR code for a direct
                  download link
                </p>

                <div className="max-w-xs mx-auto p-4 border-2 border-dashed border-emerald-200 rounded-lg bg-white">
                  <Image
                    src="/qr-code_app.png"
                    alt="QR Code to download app"
                    width={250}
                    height={250}
                    className="mx-auto"
                  />
                </div>
              </div>

              <div className="mt-8">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Or download directly
                </h3>

                {/* Platform selector tabs */}
                <div className="flex border border-gray-200 rounded-lg mb-6 p-1 max-w-sm mx-auto">
                  <button
                    onClick={() => setActiveTab("android")}
                    className={`flex-1 py-2 px-3 rounded-md text-sm font-medium ${
                      activeTab === "android"
                        ? "bg-emerald-100 text-emerald-700"
                        : "text-gray-600 hover:text-gray-900"
                    } transition-colors`}
                  >
                    Android
                  </button>
                  <button
                    onClick={() => setActiveTab("ios")}
                    className={`flex-1 py-2 px-3 rounded-md text-sm font-medium ${
                      activeTab === "ios"
                        ? "bg-emerald-100 text-emerald-700"
                        : "text-gray-600 hover:text-gray-900"
                    } transition-colors`}
                  >
                    iOS
                  </button>
                </div>

                {/* Download button for the selected platform */}
                {activeTab === "android" ? (
                  <div>
                    <a
                      href={downloadLinks[activeTab]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 py-3 px-6 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium shadow-sm mx-auto"
                    >
                      <Download className="w-5 h-5" />
                      Download for Android
                    </a>

                    <div className="mt-4">
                      <a
                        href="https://docs.ecolafaek.com/mobile-app/android.html"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-600 hover:text-emerald-800 text-sm font-medium inline-flex items-center"
                      >
                        Installation Guide
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </a>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowIosModal(true)}
                    className="flex items-center justify-center gap-2 py-3 px-6 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition-colors font-medium shadow-sm mx-auto cursor-pointer"
                  >
                    <Info className="w-5 h-5" />
                    iOS Coming Soon
                  </button>
                )}

                <div className="mt-4 text-sm text-gray-500">
                  Version 1.0.0 • Released Oct 10, 2025
                </div>

                <div className="mt-6">
                  <a
                    href={downloadLinks.direct}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-600 hover:text-emerald-800 text-sm font-medium inline-flex items-center"
                  >
                    Direct download link
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </a>
                </div>
              </div>
            </div>

            {/* Right side - App Features */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                App Features
              </h2>

              <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-sm p-6 flex items-start gap-4">
                  <div className="bg-emerald-100 rounded-full p-3 flex-shrink-0">
                    <Camera className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-1">
                      Easy Photo Reporting
                    </h3>
                    <p className="text-gray-600">
                      Take photos of waste incidents directly in the app with
                      automatic GPS location tagging
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6 flex items-start gap-4">
                  <div className="bg-emerald-100 rounded-full p-3 flex-shrink-0">
                    <MapPin className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-1">
                      Interactive Map
                    </h3>
                    <p className="text-gray-600">
                      View nearby waste incidents and hotspots to stay informed
                      about your community
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6 flex items-start gap-4">
                  <div className="bg-emerald-100 rounded-full p-3 flex-shrink-0">
                    <Trash2 className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-1">
                      Track Clean-up Efforts
                    </h3>
                    <p className="text-gray-600">
                      Follow the status of your reported incidents and see when
                      they're resolved
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 text-center sm:text-left">
                <Link
                  href="/about"
                  className="text-emerald-600 hover:text-emerald-800 font-medium inline-flex items-center"
                >
                  Learn more about our waste monitoring program
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Link>
              </div>
            </div>
          </div>

          {/* How It Works Section */}
          <div className="mt-24">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-12">
              How It Works
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Camera className="w-8 h-8 text-emerald-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  1. Report Waste
                </h3>
                <p className="text-gray-600">
                  Take a photo and provide details about the waste incident
                  you've found
                </p>
              </div>

              <div className="text-center">
                <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Smartphone className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  2. Submit & Track
                </h3>
                <p className="text-gray-600">
                  Submit your report and track its status as it's processed by
                  authorities
                </p>
              </div>

              <div className="text-center">
                <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  3. Community Impact
                </h3>
                <p className="text-gray-600">
                  Your reports help identify waste hotspots and guide cleanup
                  resources
                </p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-24 text-center">
            <div className="inline-flex items-center justify-center">
              <ArrowDown className="w-6 h-6 text-emerald-500 animate-bounce" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mt-4 mb-6">
              Download now and start making a difference
            </h2>
            <a
              href={downloadLinks.direct}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 py-3 px-8 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium shadow-sm"
            >
              <Download className="w-5 h-5" />
              Download App
            </a>
          </div>
        </div>
      </div>

      {/* iOS Modal */}
      {showIosModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 relative">
            <button
              onClick={() => setShowIosModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Smartphone className="w-8 h-8 text-blue-600" />
              </div>

              <h3 className="text-xl font-bold text-gray-900 mb-4">
                iOS App Coming Soon!
              </h3>

              <p className="text-gray-600 mb-4 leading-relaxed">
                The iOS version will be available in the future. Since this app
                is built with Flutter, creating an iOS version is technically
                straightforward, but we currently don't have the budget for an
                Apple Developer account.
              </p>

              <p className="text-gray-600 mb-6 leading-relaxed">
                For now, please use the Android version or access our web
                dashboard. We'll notify you as soon as the iOS version becomes
                available!
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowIosModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Close
                </button>
                <a
                  href={downloadLinks.android}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium text-center"
                  onClick={() => setShowIosModal(false)}
                >
                  Get Android App
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </ModernLayout>
  );
}
