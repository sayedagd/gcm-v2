export const dynamic = "force-static";

export default function UnauthorizedPage() {
  return (
    <section className="mx-auto max-w-xl rounded-xl border border-rose-200 bg-rose-50 p-6">
      <h2 className="text-2xl font-semibold text-rose-700">Unauthorized</h2>
      <p className="mt-2 text-rose-700">
        Your account role does not have access to this route. Use a role-appropriate dashboard or sign in with a different role.
      </p>
    </section>
  );
}
