import React from 'react';

const Privacy = () => (
  <div className="container-mobile py-12 min-h-[50vh]">
    <h1 className="text-3xl font-bold mb-6 text-primary">Privacy Policy</h1>
    <p className="mb-4">Your privacy is important to us at DigiNum. This policy explains how we collect, use, and protect your information.</p>
    <ul className="list-disc pl-6 space-y-2 mb-6">
      <li>We collect only the necessary information to provide our services.</li>
      <li>Your data is never shared with third parties except as required by law.</li>
      <li>We use industry-standard security measures to protect your data.</li>
      <li>You may contact us at <a href="mailto:diginum237@gmail.com" className="underline">diginum237@gmail.com</a> for privacy questions.</li>
    </ul>
    <p>By using DigiNum, you consent to this privacy policy.</p>
  </div>
);

export default Privacy;
