import { Button, Heading, Page } from "@shopify/polaris";
import { useCallback } from "react";
import gql from "graphql-tag";
import { useQuery, useMutation } from "@apollo/react-hooks";

const GETSHOPINFO = gql`
  query {
    shop {
      name
    }
  }
`;

function Index() {
  const { loading, error, data } = useQuery(GETSHOPINFO, {
    fetchPolicy: "network-only",
  });
  if (loading || !data) return null;
  return (
    <Page>
      <Heading>Shopify app with Node and React 🎉</Heading>
      <p>{data.shop.name}</p>
    </Page>
  );
}

export default Index;
