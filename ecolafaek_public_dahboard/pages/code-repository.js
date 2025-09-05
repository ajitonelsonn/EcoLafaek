import { useState } from "react";
import Layout from "../components/Layout";
import Image from "next/image";
import {
  CheckCircle,
  Code,
  Users,
  Award,
  Mail,
  User,
  Github,
} from "lucide-react";

export default function CodeRepository() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    githubUsername: "",
    role: "",
    purpose: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/code-repository-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setSubmitted(true);
        setFormData({
          name: "",
          email: "",
          githubUsername: "",
          role: "",
          purpose: "",
          message: "",
        });
      } else {
        alert("Error submitting request. Please try again.");
      }
    } catch (error) {
      alert("Error submitting request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-12">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                Request Submitted Successfully!
              </h1>
              <p className="text-gray-600 mb-6">
                All requests will be reviewed manually. You will receive an
                email notification within 30 minutes to 1 hour regarding the
                status of your request.
              </p>
              <button
                onClick={() => setSubmitted(false)}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                Submit Another Request
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Loading Popup */}
      {isSubmitting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-sm mx-4 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-100 border-t-green-500 mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Submitting Request
            </h3>
            <p className="text-gray-600">
              Please wait while we process your access request...
            </p>
          </div>
        </div>
      )}
      
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header Section */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-6">
              <Code className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              EcoLafaek Code Repository Access
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Request access to our private code repository for collaboration,
              judging, or contribution purposes.
            </p>
          </div>

          {/* Hero Image */}
          <div className="mb-12 rounded-xl overflow-hidden shadow-lg">
            <Image
              src="/image.png"
              alt="EcoLafaek Repository"
              width={1200}
              height={400}
              className="w-full h-64 object-cover"
            />
          </div>

          <div className="grid lg:grid-cols-2 gap-12">
            {/* Information Section */}
            <div className="space-y-8">
              <div className="bg-white rounded-xl p-6 shadow-lg">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  Why Request Access?
                </h2>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <Users className="w-6 h-6 text-green-600 mt-1" />
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        Collaboration
                      </h3>
                      <p className="text-gray-600">
                        Contribute to Timor-Leste's environmental monitoring
                        system
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Award className="w-6 h-6 text-green-600 mt-1" />
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        Judging & Review
                      </h3>
                      <p className="text-gray-600">
                        Evaluate code quality and implementation for
                        competitions
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Code className="w-6 h-6 text-green-600 mt-1" />
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        Learning & Research
                      </h3>
                      <p className="text-gray-600">
                        Study implementation patterns and contribute
                        improvements
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-lg">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Repository Information
                </h2>
                <div className="space-y-3 text-gray-600">
                  <p>• Private repository hosted on GitHub</p>
                  <p>• Full-stack application with mobile backend</p>
                  <p>• Built with Next.js, React, and Node.js</p>
                  <p>• Includes database schema and deployment configs</p>
                  <p>• Comprehensive documentation and setup guides</p>
                </div>
              </div>
            </div>

            {/* Request Form */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Request Access
              </h2>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <User className="w-4 h-4 inline mr-2" />
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Enter your full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Mail className="w-4 h-4 inline mr-2" />
                    Email Address *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Enter your email address"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Github className="w-4 h-4 inline mr-2" />
                    GitHub Username *
                  </label>
                  <input
                    type="text"
                    name="githubUsername"
                    value={formData.githubUsername}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Enter your GitHub username"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Role *
                  </label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">Select your role</option>
                    <option value="judge">Judge</option>
                    <option value="event_organizer">Event Organizer</option>
                    <option value="sponsor">Sponsor</option>
                    <option value="researcher">Researcher</option>
                    <option value="developer">Developer</option>
                    <option value="student">Student</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Purpose of Access *
                  </label>
                  <select
                    name="purpose"
                    value={formData.purpose}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">Select purpose</option>
                    <option value="judging">Code Review & Judging</option>
                    <option value="collaboration">
                      Collaboration & Contribution
                    </option>
                    <option value="research">Research & Learning</option>
                    <option value="sponsorship">Sponsorship Evaluation</option>
                    <option value="competition">
                      Competition Organization
                    </option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Message
                  </label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Tell us more about your request or how you plan to use the repository access..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-green-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors disabled:bg-gray-400"
                >
                  {isSubmitting
                    ? "Submitting Request..."
                    : "Submit Access Request"}
                </button>
              </form>

              <div className="mt-6 p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-700">
                  <strong>Note:</strong> All requests will be reviewed manually.
                  You will receive an email notification within 30 minutes to 1
                  hour regarding the status of your request.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
