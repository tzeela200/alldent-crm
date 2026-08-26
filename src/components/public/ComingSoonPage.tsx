import React from "react";

type ComingSoonPageProps = {
  phone?: string;
  whatsappMessage?: string;
  logoSrc?: string;
};

export function ComingSoonPage({
  phone = "053-395-1003",
  whatsappMessage = "היי, אשמח לפרטים דרך AllDent",
  logoSrc = "/images/logo-alldent.png",
}: ComingSoonPageProps) {
  const phoneDigits = phone.replace(/\D/g, "");
  const whatsappHref = `https://wa.me/972${phoneDigits.replace(/^0/, "")}?text=${encodeURIComponent(
    whatsappMessage
  )}`;

  return (
    <main dir="rtl" className="min-h-screen overflow-hidden bg-[#FAFAF7] text-[#1F2424]">
      <section className="relative flex min-h-screen items-center justify-center px-5 py-10">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute right-[-12rem] top-[-10rem] h-[34rem] w-[34rem] rounded-full bg-[#008080]/10 blur-3xl" />
          <div className="absolute bottom-[-14rem] left-[-10rem] h-[36rem] w-[36rem] rounded-full bg-[#D97706]/10 blur-3xl" />
          <div className="absolute left-[14%] top-[18%] h-2 w-2 rounded-full bg-[#008080]/25" />
          <div className="absolute right-[18%] bottom-[22%] h-2 w-2 rounded-full bg-[#D97706]/25" />
        </div>

        <div className="relative w-full max-w-[980px]">
          <div className="mx-auto rounded-[34px] border border-[#E6DED1] bg-white/78 px-6 py-9 text-center shadow-[0_24px_80px_rgba(15,15,16,0.08)] backdrop-blur md:px-16 md:py-14">
            <div className="mx-auto mb-9 flex h-24 w-24 items-center justify-center rounded-[28px] border border-[#E8E0D3] bg-[#FAFAF7] shadow-[0_14px_40px_rgba(15,15,16,0.06)] md:h-28 md:w-28">
              <img src={logoSrc} alt="AllDent" className="h-16 w-16 object-contain md:h-20 md:w-20" />
            </div>

            <p className="mx-auto mb-5 w-fit rounded-full border border-[#D9A928]/30 bg-[#FFF8E8] px-4 py-2 text-[13px] font-medium tracking-[0.02em] text-[#7B5C13]">
              האתר הציבורי מתעדכן
            </p>

            <h1 className="mx-auto max-w-[760px] text-[34px] font-[500] leading-[1.18] tracking-[-0.03em] text-[#111414] md:text-[54px]">
              האתר בשדרוג.
              <br />
              נחזור בקרוב.
            </h1>

            <p className="mx-auto mt-6 max-w-[630px] text-[17px] font-normal leading-[1.9] text-[#606968] md:text-[19px]">
              אנחנו עובדים על חוויית AllDent חדשה, נקייה ומדויקת יותר למועמדים, מרפאות ומעסיקים בענף הדנטלי.
            </p>

            <div className="mx-auto mt-10 flex max-w-[560px] flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                href={whatsappHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-[52px] w-full items-center justify-center rounded-full bg-[#B45309] px-7 text-[16px] font-medium text-white shadow-[0_14px_30px_rgba(217,119,6,0.22)] transition hover:bg-[#92400E] sm:w-auto"
              >
                שלחו הודעה בוואטסאפ
              </a>

              <a
                href={`tel:${phoneDigits}`}
                className="inline-flex min-h-[52px] w-full items-center justify-center rounded-full border border-[#CFC7BA] bg-white px-7 text-[16px] font-medium text-[#1F2424] transition hover:border-[#008080]/40 hover:bg-[#F7FBFB] sm:w-auto"
              >
                {phone}
              </a>
            </div>

            <div className="mx-auto mt-10 h-px max-w-[520px] bg-gradient-to-l from-transparent via-[#E2DACD] to-transparent" />

            <p className="mt-7 text-[14px] leading-7 text-[#7A8382]">
              עד שהאתר החדש יעלה לאוויר, ניתן ליצור קשר ישיר בטלפון או בוואטסאפ.
            </p>
          </div>

          <p className="mt-6 text-center text-[12px] text-[#8C9694]">
            AllDent · Maximizing Dental Potential
          </p>
        </div>
      </section>
    </main>
  );
}
