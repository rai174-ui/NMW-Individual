import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

export function Privacy() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-3xl bg-card rounded-2xl p-6 md:p-10 shadow-sm border border-border">
        <Link href="/login" className="inline-flex items-center text-sm text-primary hover:underline mb-6">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Link>
        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last Updated: July 2026</p>
        
        <div className="space-y-6 text-sm text-muted-foreground leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-2">1. Introduction</h2>
            <p>Welcome to HealthLogix ("we", "our", or "us"). We are committed to protecting your personal information and your right to privacy. This Privacy Policy governs the privacy policies and practices of our application (the "App") and the website located at healthlogix.nutrimyway.in. By using HealthLogix, you agree to the collection and use of information in accordance with this policy.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-2">2. Information We Collect</h2>
            <p className="mb-2">We collect information that you voluntarily provide to us when registering for the App, expressing an interest in obtaining information about us or our products and services, or otherwise contacting us. The personal information that we collect depends on the context of your interactions with us and the App.</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Personal Data:</strong> Name, email address, passwords, and contact preferences.</li>
              <li><strong>Health and Fitness Data:</strong> Weight logs, dietary preferences, daily meal logs, water consumption, caloric intake, and physical activities. This data is considered sensitive and is handled with strict confidentiality.</li>
              <li><strong>Device Data:</strong> We may request access or permission to track location-based information from your mobile device, or access your device's camera (for barcode scanning) and push notifications. If you wish to change our access or permissions, you may do so in your device's settings.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-2">3. How We Use Your Information</h2>
            <p className="mb-2">We use personal information collected via our App for a variety of business purposes described below. We process your personal information for these purposes in reliance on our legitimate business interests, in order to enter into or perform a contract with you, with your consent, and/or for compliance with our legal obligations.</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>To facilitate account creation and logon process.</li>
              <li>To provide core app functionality: tracking and analyzing your health, diet, and fitness progress.</li>
              <li>To send administrative information to you, such as product, service, and new feature information and/or information about changes to our terms, conditions, and policies.</li>
              <li>To request feedback and to contact you about your use of our App.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-2">4. Sharing Your Information</h2>
            <p>We only share information with your consent, to comply with laws, to provide you with services, to protect your rights, or to fulfill business obligations. We do not sell your personal or health data to any third parties. We may share data with trusted third-party service providers (such as cloud hosting providers like Railway) solely for the purpose of operating our infrastructure. These providers are bound by strict confidentiality agreements.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-2">5. Data Retention and Deletion</h2>
            <p className="mb-2">We will only keep your personal information for as long as it is necessary for the purposes set out in this privacy policy, unless a longer retention period is required or permitted by law. You have the right to request the deletion of your personal data at any time.</p>
            <p><strong>Account Deletion:</strong> You can delete your account and all associated health data by navigating to the Profile section within the App and selecting "Delete Account", or by contacting us directly at support@nutrimyway.in. Upon receiving a deletion request, we will permanently remove your personal and health data from our active databases within 30 days.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-2">6. Security of Your Information</h2>
            <p>We use administrative, technical, and physical security measures to help protect your personal information, including industry-standard encryption for data in transit (HTTPS). While we have taken reasonable steps to secure the personal information you provide to us, please be aware that despite our efforts, no security measures are perfect or impenetrable, and no method of data transmission can be guaranteed against any interception or other type of misuse.</p>
          </section>
          
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-2">7. Children's Privacy</h2>
            <p>We do not knowingly solicit data from or market to children under 13 years of age. By using the App, you represent that you are at least 13 or that you are the parent or guardian of such a minor and consent to such minor dependent’s use of the App.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-2">8. Contact Us</h2>
            <p>If you have questions or comments about this policy, you may email us at <strong>support@nutrimyway.in</strong>.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
