import { config } from "@/lib/config";
import { getStripe } from "@/lib/stripe/config";

type CreateCourseCheckoutOptions = {
  courseId: string;
  courseTitle: string;
  priceId: string;
  userId?: string | null;
  customerId?: string | null;
  customerEmail?: string | null;
  sourcePath?: string | null;
};

function assertAppUrl(appUrl: string) {
  try {
    const parsed = new URL(appUrl);
    if (!["https:", "http:"].includes(parsed.protocol)) throw new Error("invalid protocol");
  } catch {
    throw new Error(
      `[Stripe] NEXT_PUBLIC_APP_URL is not a valid absolute URL: "${appUrl}".`
    );
  }
}

export async function createCourseCheckoutSession({
  courseId,
  courseTitle,
  priceId,
  userId,
  customerId,
  customerEmail,
  sourcePath,
}: CreateCourseCheckoutOptions): Promise<{ url: string }> {
  if (!courseId || !priceId) {
    throw new Error("[Stripe] createCourseCheckoutSession requires courseId and priceId.");
  }

  const stripe = getStripe();
  const appUrl = config.app.url;
  assertAppUrl(appUrl);

  const normalizedSourcePath =
    sourcePath?.startsWith("/") && !sourcePath.startsWith("//") ? sourcePath : "/courses";
  const successUrl =
    `${appUrl}/subscribe/success?session_id={CHECKOUT_SESSION_ID}` +
    `&next=${encodeURIComponent("/library")}`;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: priceId, quantity: 1 }],
    customer: customerId || undefined,
    customer_email: !customerId && customerEmail ? customerEmail : undefined,
    customer_creation: customerId ? undefined : "always",
    client_reference_id: userId ?? undefined,
    metadata: {
      purchase_type: "course",
      course_id: courseId,
      courseId,
      courseTitle,
      sourcePath: normalizedSourcePath,
      ...(userId ? { member_id: userId, userId } : {}),
      ...(customerEmail ? { buyer_email: customerEmail } : {}),
    },
    success_url: successUrl,
    cancel_url: `${appUrl}${normalizedSourcePath}`,
    allow_promotion_codes: true,
    locale: "auto",
    phone_number_collection: { enabled: false },
    name_collection: {
      individual: {
        enabled: true,
        optional: true,
      },
    },
    branding_settings: {
      background_color: "#FAFAFA",
      border_style: "rounded",
      button_color: "#2EC4B6",
      display_name: "Positives",
      font_family: "montserrat",
      icon: {
        type: "url",
        url: `${appUrl}/logos/png/positives-logos_positives-icon-square.png`,
      },
      logo: {
        type: "url",
        url: `${appUrl}/logos/png/positives-logos_Positives-logo-full.png`,
      },
    },
    custom_text: {
      after_submit: {
        message: `${courseTitle} will be added to your Positives library permanently.`,
      },
      submit: {
        message: "This is a one-time course purchase. Your access stays in your library.",
      },
    },
  });

  if (!session.url) {
    throw new Error("[Stripe] Course checkout session was created but has no URL.");
  }

  return { url: session.url };
}
