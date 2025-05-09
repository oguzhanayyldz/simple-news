import "@/styles/style.css";
import Layout from "@/components/Layout";

export default function App({ Component, pageProps }) {
  return (
    <Layout title={pageProps.title || "Simple News"}>
      <Component {...pageProps} />
    </Layout>
  );
}
