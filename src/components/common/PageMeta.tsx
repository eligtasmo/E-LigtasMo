import { HelmetProvider, Helmet } from "react-helmet-async";

const PageMeta = ({
  description,
}: {
  title: string;
  description: string;
}) => (
  <Helmet>
    <title>E-LigtasMo</title>
    <meta name="description" content={description} />
  </Helmet>
);

export const AppWrapper = ({ children }: { children: React.ReactNode }) => (
  <HelmetProvider>{children}</HelmetProvider>
);

export default PageMeta;
