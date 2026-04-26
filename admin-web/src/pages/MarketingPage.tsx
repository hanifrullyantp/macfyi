import { MarketingSettingsAdmin } from "../MarketingSettingsAdmin";
import { AdminPageFrame } from "../ui2/components/AdminPageFrame";

export default function MarketingPage() {
  return (
    <AdminPageFrame
      description={
        <>
          Kunci <code>platform_settings</code> yang mempengaruhi landing &amp; desktop lewat Edge <code>public-config</code>. Simpan perubahan lalu tunggu bump{" "}
          <code>config_version</code>.
        </>
      }
    >
      <MarketingSettingsAdmin />
    </AdminPageFrame>
  );
}
