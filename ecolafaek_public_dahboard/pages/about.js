// pages/about.js
import { useState, useEffect } from "react";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import ModernLayout from "../components/Layout";
import {
  Users,
  Globe,
  BarChart2,
  Award,
  MapPin,
  Mail,
  ChevronDown,
  ExternalLink,
  AlertTriangle,
  Smartphone,
  Brain,
  Shield,
  Target,
  TrendingUp,
  Heart,
} from "lucide-react";

export default function AboutPage() {
  const [openFaq, setOpenFaq] = useState(null);
  const [openLimitation, setOpenLimitation] = useState(null);
  const [statsAnimated, setStatsAnimated] = useState(false);

  // Animate stats when they come into view
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStatsAnimated(true);
        }
      },
      { threshold: 0.3 }
    );

    const statsElement = document.getElementById("impact-stats");
    if (statsElement) {
      observer.observe(statsElement);
    }

    return () => observer.disconnect();
  }, []);

  const toggleFaq = (index) => {
    if (openFaq === index) {
      setOpenFaq(null);
    } else {
      setOpenFaq(index);
    }
  };

  const toggleLimitation = (index) => {
    if (openLimitation === index) {
      setOpenLimitation(null);
    } else {
      setOpenLimitation(index);
    }
  };

  // FAQ items array
  const faqItems = [
    {
      question: "What is EcoLafaek?",
      answer:
        "EcoLafaek is an AI-powered system that addresses waste management challenges in Timor-Leste through a network of intelligent agents. It enables citizens to report waste issues via a mobile app, provides authorities with actionable insights through an analytical dashboard, and facilitates data-driven decision-making for waste management.",
    },
    {
      question: "How can I contribute to the project?",
      answer:
        "You can download our mobile app to report waste issues in your area, explore the public dashboard to view waste hotspots, or even deploy your own instance of our system by accessing our GitHub repositories. All code and documentation are available open-source.",
    },
    {
      question: "How does the AI analysis work?",
      answer:
        "Our system uses Amazon Nova-Pro's multimodal capabilities to analyze waste images, classify waste types, assess severity, and identify potential environmental impacts. The system also detects waste hotspots using spatial clustering algorithms and leverages advanced image recognition to provide detailed waste analysis.",
    },
    {
      question: "Who is behind this initiative?",
      answer:
        "The project was created by Ajito Nelson Lucio da Costa.. It addresses real waste management challenges in Timor-Leste based on JICA survey data showing that Dili produces over 300 tons of waste daily, with more than 100 tons going uncollected.",
    },
    {
      question: "Is my data private when I submit reports?",
      answer:
        "We take data privacy seriously. While report locations and images are shared publicly to help address waste issues, user authentication is secured using JWT tokens with PBKDF2-SHA256 password hashing. All personal data is handled in accordance with our privacy policy.",
    },
  ];

  return (
    <ModernLayout>
      <Head>
        <title>About | EcoLafaek</title>
        <meta
          name="description"
          content="AI-powered waste management system for Timor-Leste"
        />
      </Head>

      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 pt-16 pb-20 overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-white/20"></div>
        <div className="absolute top-0 left-0 w-full h-full opacity-5">
          <div className="absolute top-10 left-10 w-20 h-20 bg-emerald-400 rounded-full blur-xl"></div>
          <div className="absolute top-40 right-20 w-32 h-32 bg-green-300 rounded-full blur-2xl"></div>
          <div className="absolute bottom-20 left-1/4 w-24 h-24 bg-teal-400 rounded-full blur-xl"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center px-4 py-2 bg-emerald-100 text-emerald-800 rounded-full text-sm font-medium mb-8 border border-emerald-200">
            <Heart className="w-4 h-4 mr-2" />
            Building a cleaner future for Timor-Leste
          </div>

          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-green-600">
            About EcoLafaek
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 max-w-4xl mx-auto mb-8 leading-relaxed">
            AI-powered waste management system connecting{" "}
            <span className="font-semibold text-emerald-700">citizens</span>,
            <span className="font-semibold text-emerald-700"> authorities</span>
            , and{" "}
            <span className="font-semibold text-emerald-700">technology</span>{" "}
            to combat waste challenges in Timor-Leste
          </p>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12 max-w-4xl mx-auto">
            <div className="bg-white/70 backdrop-blur-sm rounded-lg p-4 border border-emerald-100">
              <div className="text-2xl font-bold text-emerald-600">300+</div>
              <div className="text-sm text-gray-600">Tons Daily Waste</div>
            </div>
            <div className="bg-white/70 backdrop-blur-sm rounded-lg p-4 border border-emerald-100">
              <div className="text-2xl font-bold text-emerald-600">100+</div>
              <div className="text-sm text-gray-600">Tons Uncollected</div>
            </div>
            <div className="bg-white/70 backdrop-blur-sm rounded-lg p-4 border border-emerald-100">
              <div className="text-2xl font-bold text-emerald-600">AI</div>
              <div className="text-sm text-gray-600">Powered Analysis</div>
            </div>
            <div className="bg-white/70 backdrop-blur-sm rounded-lg p-4 border border-emerald-100">
              <div className="text-2xl font-bold text-emerald-600">24/7</div>
              <div className="text-sm text-gray-600">Community Reports</div>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-4 mt-8">
            <Link
              href="/download"
              className="group px-8 py-4 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              <div className="flex items-center space-x-2">
                <Smartphone className="w-5 h-5" />
                <span>Get the App</span>
              </div>
            </Link>
            <Link
              href="/map"
              className="group px-8 py-4 bg-white/80 backdrop-blur-sm border border-emerald-200 text-emerald-700 rounded-xl hover:bg-emerald-50 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              <div className="flex items-center space-x-2">
                <MapPin className="w-5 h-5" />
                <span>Explore the Map</span>
              </div>
            </Link>
            <Link
              href="/dashboard"
              className="group px-8 py-4 bg-white/80 backdrop-blur-sm border border-emerald-200 text-emerald-700 rounded-xl hover:bg-emerald-50 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              <div className="flex items-center space-x-2">
                <BarChart2 className="w-5 h-5" />
                <span>View Analytics</span>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Our Mission Section */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                Our Mission
              </h2>
              <p className="text-lg text-gray-600 mb-4">
                EcoLafaek aims to address Timor-Leste's waste management
                challenges through innovative technology, community engagement,
                and data-driven decision-making.
              </p>
              <p className="text-lg text-gray-600 mb-4">
                Dili produces over 300 tons of waste daily, with more than 100
                tons going uncollected. This waste clogs drainage systems,
                causing flooding and environmental damage.
              </p>
              <p className="text-lg text-gray-600">
                Our vision is a cleaner Timor-Leste where communities are
                empowered to report waste issues, authorities have the data they
                need to prioritize cleanup efforts, and environmental health
                improves.
              </p>
            </div>
            <div className="lg:ml-auto">
              <div
                id="impact-stats"
                className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl p-8 border border-emerald-200 shadow-lg"
              >
                <div className="text-center mb-6">
                  <div className="inline-flex items-center px-4 py-2 bg-emerald-100 text-emerald-800 rounded-full text-sm font-medium mb-4 border border-emerald-200">
                    <Target className="w-4 h-4 mr-2" />
                    Impact Projections
                  </div>
                  <h3 className="text-2xl font-bold text-emerald-800 mb-2">
                    Expected First-Year Impact
                  </h3>
                  <p className="text-emerald-700">
                    Measurable outcomes for Timor-Leste
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 text-center shadow-md border border-white/50 hover:shadow-lg transition-shadow">
                    <div className="text-4xl font-bold text-emerald-600 mb-2 flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 mr-2" />
                      5,000+
                    </div>
                    <div className="text-sm font-medium text-gray-700">
                      Citizen Reports
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Community engagement
                    </div>
                  </div>
                  <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 text-center shadow-md border border-white/50 hover:shadow-lg transition-shadow">
                    <div className="text-4xl font-bold text-emerald-600 mb-2 flex items-center justify-center">
                      <MapPin className="w-6 h-6 mr-2" />
                      100+
                    </div>
                    <div className="text-sm font-medium text-gray-700">
                      Hotspots Identified
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Problem areas mapped
                    </div>
                  </div>
                  <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 text-center shadow-md border border-white/50 hover:shadow-lg transition-shadow">
                    <div className="text-4xl font-bold text-emerald-600 mb-2 flex items-center justify-center">
                      <Shield className="w-6 h-6 mr-2" />
                      30%
                    </div>
                    <div className="text-sm font-medium text-gray-700">
                      Drainage Protection
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Blockage reduction
                    </div>
                  </div>
                  <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 text-center shadow-md border border-white/50 hover:shadow-lg transition-shadow">
                    <div className="text-4xl font-bold text-emerald-600 mb-2 flex items-center justify-center">
                      <BarChart2 className="w-6 h-6 mr-2" />
                      20%
                    </div>
                    <div className="text-sm font-medium text-gray-700">
                      Collection Efficiency
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Resource optimization
                    </div>
                  </div>
                </div>

                {/* Progress indicator */}
                <div className="mt-6 text-center">
                  <div className="inline-flex items-center px-3 py-2 bg-white/60 rounded-full text-xs text-emerald-700 border border-emerald-200">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse"></div>
                    Real-time impact tracking available in dashboard
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            How It Works
          </h2>

          <div className="relative">
            {/* Timeline connector */}
            <div className="hidden md:block absolute top-0 bottom-0 left-1/2 w-0.5 bg-emerald-200 transform -translate-x-1/2"></div>

            {/* Timeline items */}
            <div className="space-y-16">
              {/* Item 1 */}
              <div className="relative">
                <div className="md:flex items-center">
                  <div className="md:w-1/2 mb-8 md:mb-0 md:pr-12 md:text-right">
                    <h3 className="text-xl font-bold text-emerald-700 mb-2">
                      Citizen Reporting
                    </h3>
                    <p className="text-gray-600">
                      Citizens use our Flutter-based mobile app to report waste
                      with photos and location data. The app works in
                      low-connectivity environments and uploads reports to our
                      system for processing.
                    </p>
                  </div>

                  <div className="hidden md:block absolute left-1/2 transform -translate-x-1/2 -translate-y-1/4">
                    <div className="bg-emerald-500 rounded-full h-10 w-10 flex items-center justify-center shadow-lg border-4 border-white">
                      <span className="text-white font-bold">1</span>
                    </div>
                  </div>

                  <div className="md:w-1/2 md:pl-12">
                    <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                      <Image
                        src="/hw/1.png"
                        alt="Community reporting illustration"
                        width={600}
                        height={300}
                        className="rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Item 2 */}
              <div className="relative">
                <div className="md:flex items-center">
                  <div className="md:w-1/2 mb-8 md:mb-0 md:pr-12 order-last md:order-first">
                    <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                      <Image
                        src="/hw/2.png"
                        alt="Data analysis illustration"
                        width={600}
                        height={300}
                        className="rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="hidden md:block absolute left-1/2 transform -translate-x-1/2 -translate-y-1/4">
                    <div className="bg-emerald-500 rounded-full h-10 w-10 flex items-center justify-center shadow-lg border-4 border-white">
                      <span className="text-white font-bold">2</span>
                    </div>
                  </div>

                  <div className="md:w-1/2 md:pl-12 md:text-left">
                    <h3 className="text-xl font-bold text-emerald-700 mb-2">
                      AI-Powered Analysis
                    </h3>
                    <p className="text-gray-600">
                      Our system processes waste images using Amazon Nova-Pro to
                      classify waste types, assess severity, and evaluate
                      environmental impact. The system also detects hotspots
                      where multiple waste reports are clustered.
                    </p>
                  </div>
                </div>
              </div>

              {/* Item 3 */}
              <div className="relative">
                <div className="md:flex items-center">
                  <div className="md:w-1/2 mb-8 md:mb-0 md:pr-12 md:text-right">
                    <h3 className="text-xl font-bold text-emerald-700 mb-2">
                      Coordination & Action
                    </h3>
                    <p className="text-gray-600">
                      The data is used to prioritize cleanup efforts, directing
                      resources to the most critical areas. The system maintains
                      a database of waste issues and their status, tracking
                      progress from report to resolution.
                    </p>
                  </div>

                  <div className="hidden md:block absolute left-1/2 transform -translate-x-1/2 -translate-y-1/4">
                    <div className="bg-emerald-500 rounded-full h-10 w-10 flex items-center justify-center shadow-lg border-4 border-white">
                      <span className="text-white font-bold">3</span>
                    </div>
                  </div>

                  <div className="md:w-1/2 md:pl-12">
                    <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                      <Image
                        src="/hw/3.png"
                        alt="Coordination and action illustration"
                        width={600}
                        height={300}
                        className="rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Item 4 */}
              <div className="relative">
                <div className="md:flex items-center">
                  <div className="md:w-1/2 mb-8 md:mb-0 md:pr-12 order-last md:order-first">
                    <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                      <Image
                        src="/hw/4.png"
                        alt="Monitoring and reporting illustration"
                        width={600}
                        height={300}
                        className="rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="hidden md:block absolute left-1/2 transform -translate-x-1/2 -translate-y-1/4">
                    <div className="bg-emerald-500 rounded-full h-10 w-10 flex items-center justify-center shadow-lg border-4 border-white">
                      <span className="text-white font-bold">4</span>
                    </div>
                  </div>

                  <div className="md:w-1/2 md:pl-12 md:text-left">
                    <h3 className="text-xl font-bold text-emerald-700 mb-2">
                      Public Dashboard
                    </h3>
                    <p className="text-gray-600">
                      Our Next.js web dashboard provides visualizations of waste
                      data, including interactive maps, analytics, and community
                      leaderboards. This creates transparency and helps measure
                      the impact of interventions over time.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Key Features Section */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Key Features
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="bg-emerald-100 rounded-full p-3 w-12 h-12 flex items-center justify-center mb-4">
                <MapPin className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Interactive Mapping
              </h3>
              <p className="text-gray-600">
                Visual representation of waste incidents and hotspots across
                Timor-Leste with detailed filtering and spatial clustering.
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="bg-emerald-100 rounded-full p-3 w-12 h-12 flex items-center justify-center mb-4">
                <BarChart2 className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                AI-Powered Analysis
              </h3>
              <p className="text-gray-600">
                Amazon Nova-Pro integration for waste classification, severity
                assessment, and environmental impact evaluation from report
                images.
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="bg-emerald-100 rounded-full p-3 w-12 h-12 flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Community Engagement
              </h3>
              <p className="text-gray-600">
                Citizen participation through mobile app reporting and gamified
                leaderboards to encourage active involvement in waste
                management.
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="bg-emerald-100 rounded-full p-3 w-12 h-12 flex items-center justify-center mb-4">
                <Globe className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Low-Bandwidth Support
              </h3>
              <p className="text-gray-600">
                Mobile app optimized for Timor-Leste's connectivity challenges,
                with efficient image compression.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Technology Section */}
      <div className="py-20 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-800 rounded-full text-sm font-medium mb-6">
              <Brain className="w-4 h-4 mr-2" />
              Powered by Innovation
            </div>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Our Technology Stack
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              We leverage cutting-edge technologies to create a robust, scalable
              waste monitoring system that works in Timor-Leste's unique
              environment
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Amazon Nova-Pro */}
            <div className="group bg-white rounded-2xl p-8 shadow-lg border border-gray-200 hover:shadow-xl hover:-translate-y-2 transition-all duration-300">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-red-500 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Brain className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-bold text-xl text-gray-900 mb-2">
                  Amazon Nova-Pro
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Advanced AI Analysis
                </p>
                <div className="text-xs text-gray-500 leading-relaxed">
                  Multimodal AI for waste classification, severity assessment,
                  and environmental impact analysis
                </div>
              </div>
            </div>

            {/* FastAPI */}
            <div className="group bg-white rounded-2xl p-8 shadow-lg border border-gray-200 hover:shadow-xl hover:-translate-y-2 transition-all duration-300">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Globe className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-bold text-xl text-gray-900 mb-2">
                  FastAPI
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  High-Performance Backend
                </p>
                <div className="text-xs text-gray-500 leading-relaxed">
                  Fast, modern Python API with automatic documentation and
                  robust data processing
                </div>
              </div>
            </div>

            {/* Flutter */}
            <div className="group bg-white rounded-2xl p-8 shadow-lg border border-gray-200 hover:shadow-xl hover:-translate-y-2 transition-all duration-300">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Smartphone className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-bold text-xl text-gray-900 mb-2">
                  Flutter
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Cross-Platform Mobile
                </p>
                <div className="text-xs text-gray-500 leading-relaxed">
                  Optimized for low-connectivity environments.
                </div>
              </div>
            </div>

            {/* Next.js */}
            <div className="group bg-white rounded-2xl p-8 shadow-lg border border-gray-200 hover:shadow-xl hover:-translate-y-2 transition-all duration-300">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-500 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <BarChart2 className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-bold text-xl text-gray-900 mb-2">
                  Next.js
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Interactive Dashboard
                </p>
                <div className="text-xs text-gray-500 leading-relaxed">
                  Real-time visualizations, analytics, and community engagement
                  platform
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* FAQs */}
      <div className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Frequently Asked Questions
          </h2>

          <div className="space-y-4">
            {faqItems.map((item, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-lg overflow-hidden"
              >
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full flex justify-between items-center p-4 text-left bg-white hover:bg-gray-50 transition-colors"
                >
                  <span className="font-medium text-gray-900">
                    {item.question}
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 text-gray-500 transition-transform ${
                      openFaq === index ? "transform rotate-180" : ""
                    }`}
                  />
                </button>

                {openFaq === index && (
                  <div className="p-4 bg-gray-50 border-t border-gray-200">
                    <p className="text-gray-600">{item.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-16 bg-emerald-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-emerald-800 rounded-full mx-auto w-20 h-20 flex items-center justify-center mb-6">
            <Award className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-bold mb-4">
            Join Us in Making a Difference
          </h2>
          <p className="text-xl mb-8 max-w-3xl mx-auto">
            Download our app, report waste incidents, and become part of the
            solution for a cleaner Timor-Leste
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/download"
              className="px-6 py-3 bg-white text-emerald-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
            >
              Download the App
            </Link>
          </div>
        </div>
      </div>

      {/* Team Section */}
      <div className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">
            Meet Our Team
          </h2>
          <p className="text-gray-600 text-center max-w-3xl mx-auto mb-12">
            EcoLafaek is a dedicated team of innovators working to create
            technological solutions for challenges in Timor-Leste.
          </p>
          <div className="flex flex-col items-center mb-16">
            <div className="w-40 h-40 rounded-full overflow-hidden mb-4 border-4 border-emerald-500 shadow-lg">
              <Image
                src="/team/ajito.jpg"
                alt="Ajito Nelson Lucio da Costa"
                width={160}
                height={160}
                className="object-cover w-full h-full"
                onError={(e) => {
                  e.target.src = "https://via.placeholder.com/160?text=Ajito";
                }}
              />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1">
              Ajito Nelson Lucio da Costa
            </h3>
            <p className="text-emerald-600 font-medium mb-3">
              Founder & Lead Developer
            </p>
            <p className="text-gray-600 max-w-md text-center mb-4">
              Passionate about using technology to create positive environmental
              impact in Timor-Leste through innovative solutions.
            </p>
            <div className="flex space-x-4">
              <a
                href="https://x.com/ajitonelson"
                className="text-emerald-600 hover:text-emerald-800"
              >
                <svg
                  className="w-6 h-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                </svg>
              </a>

              <a
                href="https://github.com/ajitonelsonn"
                className="text-emerald-600 hover:text-emerald-800"
              >
                <svg
                  className="w-6 h-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                    clipRule="evenodd"
                  />
                </svg>
              </a>

              <a
                href="https://www.linkedin.com/in/ajitonelson/"
                className="text-emerald-600 hover:text-emerald-800"
              >
                <svg
                  className="w-6 h-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                </svg>
              </a>
            </div>
          </div>
          <div className="text-center">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              EcoLafaek Team
            </h3>
            <p className="text-gray-600 max-w-2xl mx-auto mb-8">
              Our diverse team brings together expertise in software
              development, environmental science, data analysis, and community
              engagement to create AI-powered solutions for Timor-Leste's
              environmental challenges.
            </p>

            <div className="inline-flex bg-emerald-50 rounded-full px-6 py-3 border border-emerald-100 text-emerald-700 font-medium mb-4">
              Lafaek means "Crocodile" in Tetum, symbolizing our commitment to
              protecting Timor-Leste's environment
            </div>
          </div>
        </div>
      </div>
    </ModernLayout>
  );
}
