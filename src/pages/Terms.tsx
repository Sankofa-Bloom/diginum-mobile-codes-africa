import React from 'react';

const Terms = () => (
  <div className="container-mobile py-12 min-h-[50vh]">
    <h1 className="text-3xl font-bold mb-6 text-primary">Terms of Use</h1>
    <p className="mb-4">Welcome to DigiNum. By using our service, you agree to the following terms and conditions. Please read them carefully.</p>
    <ul className="list-disc pl-6 space-y-2 mb-6">
      <li>You must use DigiNum services in compliance with all applicable laws and regulations.</li>
      <li>Virtual numbers provided are for temporary use and may not be used for illegal activities.</li>
      <li>DigiNum is not responsible for misuse of the service or any third-party actions.</li>
      <li>We reserve the right to suspend or terminate accounts for violations of our terms.</li>
      <li>For more information, contact us at <a href="mailto:diginum237@gmail.com" className="underline">diginum237@gmail.com</a>.</li>
    </ul>
    <p>Thank you for choosing DigiNum!</p>
  </div>
);

export default Terms;
