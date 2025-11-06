export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-primary-600 mb-4">
          Patient Studio
        </h1>
        <p className="text-lg text-gray-600">
          Healthcare Scheduler - Simplified MVP
        </p>
        <p className="text-sm text-gray-500 mt-2">
          HIPAA-compliant appointment scheduling and clinical documentation
        </p>
      </div>
    </main>
  );
}
