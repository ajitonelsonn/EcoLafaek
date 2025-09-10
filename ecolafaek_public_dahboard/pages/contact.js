// pages/contact.js
import { useState } from "react";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import ModernLayout from "../components/Layout";
import {
  Mail,
  Phone,
  MapPin,
  Github,
  Twitter,
  Linkedin,
  MessageCircle,
  Send,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Globe,
  Clock,
  Heart,
} from "lucide-react";

export default function ContactPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
    type: "general",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setSubmitStatus("success");
        setFormData({
          name: "",
          email: "",
          subject: "",
          message: "",
          type: "general",
        });
        // Redirect to home page after 10 seconds
        setTimeout(() => {
          router.push("/");
        }, 10000);
      } else {
        setSubmitStatus("error");
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      setSubmitStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const contactMethods = [
    {
      icon: <Mail className="w-6 h-6" />,
      title: "Email",
      description: "Send us an email anytime",
      contact: "ecolafaek@gmail.com",
      action: "mailto:ecolafaek@gmail.com",
      color: "from-blue-500 to-blue-600",
    },
    {
      icon: <Github className="w-6 h-6" />,
      title: "GitHub",
      description: "Report issues or contribute",
      contact: "EcoLafaek Repository",
      action: "/code-repository",
      color: "from-gray-700 to-gray-800",
    },
    {
      icon: <Globe className="w-6 h-6" />,
      title: "Download",
      description: "Check system status",
      contact: "ecolafaek.com/download",
      action: "https://ecolafaek.com/download",
      color: "from-green-500 to-green-600",
    },
    {
      icon: <MessageCircle className="w-6 h-6" />,
      title: "Feedback",
      description: "Share your thoughts",
      contact: "Community feedback welcome",
      action: "#contact-form",
      color: "from-purple-500 to-purple-600",
    },
  ];

  const socialLinks = [
    {
      name: "Twitter",
      icon: <Twitter className="w-5 h-5" />,
      url: "https://x.com/ajitonelson",
      color: "hover:text-blue-500",
    },
    {
      name: "LinkedIn",
      icon: <Linkedin className="w-5 h-5" />,
      url: "https://www.linkedin.com/in/ajitonelson/",
      color: "hover:text-blue-700",
    },
    {
      name: "GitHub",
      icon: <Github className="w-5 h-5" />,
      url: "https://github.com/ajitonelsonn",
      color: "hover:text-gray-700",
    },
  ];

  return (
    <ModernLayout>
      <Head>
        <title>Contact Us | EcoLafaek</title>
        <meta
          name="description"
          content="Get in touch with the EcoLafaek team. Report issues, ask questions, or contribute to our mission of cleaning Timor-Leste."
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
            We're here to help
          </div>

          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-green-600">
            Contact EcoLafaek
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 max-w-4xl mx-auto mb-8 leading-relaxed">
            Have questions about our{" "}
            <span className="font-semibold text-emerald-700">
              waste monitoring system
            </span>
            ? Want to{" "}
            <span className="font-semibold text-emerald-700">contribute</span>{" "}
            to the project? We'd love to hear from you!
          </p>

          <div className="flex flex-wrap justify-center gap-4 mt-8">
            <a
              href="mailto:ecolafaek@gmail.com"
              className="group px-8 py-4 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              <div className="flex items-center space-x-2">
                <Mail className="w-5 h-5" />
                <span>Send Email</span>
              </div>
            </a>
            <a
              href="/code-repository"
              target="_blank"
              rel="noopener noreferrer"
              className="group px-8 py-4 bg-white/80 backdrop-blur-sm border border-emerald-200 text-emerald-700 rounded-xl hover:bg-emerald-50 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              <div className="flex items-center space-x-2">
                <Github className="w-5 h-5" />
                <span>View Repository</span>
              </div>
            </a>
          </div>
        </div>
      </div>

      {/* Contact Methods */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Get In Touch
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Choose the best way to reach us. We're committed to responding
              quickly and helping you make the most of EcoLafaek.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {contactMethods.map((method, index) => (
              <a
                key={index}
                href={method.action}
                target={method.action.startsWith("http") ? "_blank" : "_self"}
                rel={
                  method.action.startsWith("http") ? "noopener noreferrer" : ""
                }
                className="group bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                <div
                  className={`w-12 h-12 bg-gradient-to-r ${method.color} rounded-lg flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform`}
                >
                  {method.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {method.title}
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  {method.description}
                </p>
                <p className="text-sm font-medium text-emerald-600 group-hover:text-emerald-700">
                  {method.contact}
                </p>
                {method.action.startsWith("http") && (
                  <ExternalLink className="w-4 h-4 text-gray-400 mt-2 group-hover:text-emerald-600" />
                )}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Contact Form */}
      <div id="contact-form" className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Send Us a Message
            </h2>
            <p className="text-lg text-gray-600">
              Fill out the form below and we'll get back to you as soon as
              possible.
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-8">

            {submitStatus === "error" && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <div>
                  <h4 className="font-medium text-red-800">Error sending message</h4>
                  <p className="text-sm text-red-600">Please try again or contact us directly at ecolafaek@gmail.com.</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Your Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                    placeholder="Enter your full name"
                  />
                </div>
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                    placeholder="your.email@example.com"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="type"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Message Type
                </label>
                <select
                  id="type"
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                >
                  <option value="general">General Inquiry</option>
                  <option value="bug">Bug Report</option>
                  <option value="feature">Feature Request</option>
                  <option value="partnership">Partnership</option>
                  <option value="support">Technical Support</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="subject"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Subject *
                </label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  required
                  value={formData.subject}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  placeholder="Brief description of your message"
                />
              </div>

              <div>
                <label
                  htmlFor="message"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Message *
                </label>
                <textarea
                  id="message"
                  name="message"
                  required
                  rows={6}
                  value={formData.message}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors resize-none"
                  placeholder="Tell us more about your inquiry, feedback, or how we can help you..."
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-8 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-colors font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send Message
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Team & Social */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                Meet the Creator
              </h2>
              <div className="flex items-center gap-6 mb-6">
                <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-emerald-500 shadow-lg">
                  <Image
                    src="/team/ajito.jpg"
                    alt="Ajito Nelson Lucio da Costa"
                    width={80}
                    height={80}
                    className="object-cover w-full h-full"
                    onError={(e) => {
                      e.target.src =
                        "https://via.placeholder.com/80?text=Ajito";
                    }}
                  />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    Ajito Nelson Lucio da Costa
                  </h3>
                  <p className="text-emerald-600 font-medium">
                    Founder & Lead Developer
                  </p>
                  <div className="flex space-x-3 mt-2">
                    {socialLinks.map((social) => (
                      <a
                        key={social.name}
                        href={social.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`text-gray-400 ${social.color} transition-colors`}
                        title={social.name}
                      >
                        {social.icon}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-gray-600 mb-4">
                The spirit to learn for a bright future for my country
                Timor-Leste🇹🇱.
              </p>
              <div className="inline-flex items-center px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full text-sm border border-emerald-200">
                <Clock className="w-4 h-4 mr-2" />
                Usually responds within 24 hours
              </div>
            </div>

            <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl p-8 border border-emerald-100">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Project Information
              </h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-emerald-600" />
                  <div>
                    <p className="font-medium text-gray-900">Location</p>
                    <p className="text-sm text-gray-600">Timor-Leste 🇹🇱</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Globe className="w-5 h-5 text-emerald-600" />
                  <div>
                    <p className="font-medium text-gray-900">Live System</p>
                    <p className="text-sm text-gray-600">ecolafaek.com</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Heart className="w-5 h-5 text-emerald-600" />
                  <div>
                    <p className="font-medium text-gray-900">Mission</p>
                    <p className="text-sm text-gray-600">
                      Environmental protection through technology
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="py-12 bg-emerald-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h3 className="text-2xl font-bold mb-4">
              Ready to Make a Difference?
            </h3>
            <p className="text-emerald-100 mb-6 max-w-2xl mx-auto">
              Join our mission to create a cleaner, healthier Timor-Leste
              through community-powered environmental monitoring.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/download"
                className="px-6 py-3 bg-white text-emerald-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
              >
                Download the App
              </Link>
              <Link
                href="/about"
                className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-800 transition-colors font-medium border border-emerald-500"
              >
                Learn More
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Success Popup */}
      {submitStatus === "success" && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-500 to-green-600 p-6 text-center">
              <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">
                Message Sent Successfully!
              </h3>
              <p className="text-emerald-100">
                Thank you for contacting EcoLafaek
              </p>
            </div>
            
            <div className="p-6 text-center">
              <div className="mb-6">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-6 h-6 text-emerald-600" />
                </div>
                <p className="text-gray-600 mb-2">
                  We've received your message and will get back to you within{" "}
                  <span className="font-semibold text-emerald-600">24 hours</span>.
                </p>
                <p className="text-sm text-gray-500">
                  A confirmation email has been sent to your inbox.
                </p>
              </div>
              
              <div className="bg-emerald-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-emerald-700 font-medium">
                  🏠 Redirecting to home page in a few seconds...
                </p>
              </div>
              
              <button
                onClick={() => router.push("/")}
                className="w-full bg-emerald-600 text-white py-3 px-6 rounded-lg hover:bg-emerald-700 transition-colors font-medium"
              >
                Go to Home Page Now
              </button>
            </div>
          </div>
        </div>
      )}
    </ModernLayout>
  );
}
