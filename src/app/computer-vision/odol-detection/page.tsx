import { ComingSoonPage } from "@/components/coming-soon-page";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/dictionary";
import { t } from "@/lib/i18n/t";

export default async function OdolDetectionPage() {
  const locale = await getLocale();
  const dict = await getDictionary(locale);

  return (
    <ComingSoonPage
      title={t(dict, "cv.odol.title")}
      description={t(dict, "cv.odol.description")}
    />
  );
}
