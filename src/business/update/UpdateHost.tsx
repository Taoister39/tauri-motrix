import UpdateViewer from "@/business/update/UpdateViewer";
import { useUpdateStore } from "@/services/updates";

export default function UpdateHost() {
  const { update, open } = useUpdateStore();
  if (!update) return null;
  return (
    <UpdateViewer
      key={update.version}
      updateInfo={update}
      open={open}
      onClose={() => useUpdateStore.setState({ open: false })}
    />
  );
}
