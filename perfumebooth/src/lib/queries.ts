import { generateMetafieldFragment } from "./metafields.config";

export const getProductsQuery = `
  query getProducts($first: Int!, $after: String, $query: String, $sortKey: ProductSortKeys, $reverse: Boolean) {
    products(first: $first, after: $after, query: $query, sortKey: $sortKey, reverse: $reverse) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          title
          handle
          vendor
          tags
          availableForSale
          featuredImage {
            url
            altText
          }
          images(first: 5) {
            nodes {
              url
              altText
            }
          }
          priceRange {
            minVariantPrice {
              amount
              currencyCode
            }
          }
          compareAtPriceRange {
            minVariantPrice {
              amount
            }
          }
          variants(first: 1) {
            edges {
              node {
                id
                quantityAvailable
              }
            }
          }
          ${generateMetafieldFragment()}
        }
      }
    }
  }
`;

export const getBestSellingProductsQuery = `
  query getBestSellingProducts($first: Int!, $query: String) {
    products(first: $first, query: $query, sortKey: BEST_SELLING) {
      edges {
        node {
          id
          title
          handle
          vendor
          tags
          availableForSale
          featuredImage {
            url
            altText
          }
          images(first: 5) {
            nodes {
              url
              altText
            }
          }
          priceRange {
            minVariantPrice {
              amount
              currencyCode
            }
          }
          compareAtPriceRange {
            minVariantPrice {
              amount
            }
          }
          variants(first: 1) {
            edges {
              node {
                id
                quantityAvailable
              }
            }
          }
          productType
          ${generateMetafieldFragment()}
        }
      }
    }
  }
`;
export const getCollectionQuery = `
  query getCollection(
    $handle: String!, 
    $first: Int!, 
    $after: String, 
    $filters: [ProductFilter!], 
    $sortKey: ProductCollectionSortKeys, 
    $reverse: Boolean
  ) {
    collection(handle: $handle) {
      id
      title
      handle
      description
      image {
        url
        altText
      }
      products(
        first: $first, 
        after: $after, 
        sortKey: $sortKey, 
        reverse: $reverse, 
        filters: $filters
      ) {
        filters {
          id
          label
          type
          values {
            id
            label
            count
            input
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
        edges {
          node {
            id
            title
            handle
            vendor
            tags
            availableForSale
            productType
            priceRange {
              minVariantPrice {
                amount
                currencyCode
              }
            }
            compareAtPriceRange {
              minVariantPrice {
                amount
              }
            }
            featuredImage {
              url
              altText
            }
            images(first: 5) {
              nodes {
                url
                altText
              }
            }
            variants(first: 1) {
              edges {
                node {
                  id
                  quantityAvailable
                }
              }
            }
            ${generateMetafieldFragment()}
          }
        }
      }
    }
  }
  `;
export const getCollectionsQuery = `
  query getCollections($first: Int!, $after: String) {
    collections(first: $first, after: $after) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          title
          handle
          description
          image {
            url
            altText
          }
        }
      }
    }
  }
`;
export const getCollectionMetaQuery = `
  query getCollectionMeta($handle: String!) {
    collection(handle: $handle) {
      id
      title
      description
      image {
        url
        altText
      }
    }
  }
`;

export const getSearchProductsQuery = `
  query getSearchProducts(
    $query: String!, 
    $first: Int!, 
    $after: String, 
    $sortKey: SearchSortKeys, 
    $reverse: Boolean,
    $filters: [ProductFilter!]
  ) {
    search(
      query: $query, 
      first: $first, 
      after: $after, 
      sortKey: $sortKey, 
      reverse: $reverse, 
      productFilters: $filters,
      types: [PRODUCT]
    ) {
      edges {
        cursor
        node {
          ... on Product {
            id
            handle
            title
            description
            vendor
            tags
            availableForSale
            productType
            priceRange {
              minVariantPrice {
                amount
                currencyCode
              }
            }
            compareAtPriceRange {
              minVariantPrice {
                amount
              }
            }
            featuredImage {
              url
              altText
            }
            images(first: 5) {
              nodes {
                url
                altText
              }
            }
            variants(first: 1) {
              edges {
                node {
                  id
                  quantityAvailable
                }
              }
            }
            top_notes: metafield(namespace: "custom", key: "top_notes") { value }
            topnotes: metafield(namespace: "custom", key: "topnotes") { value }
            middle_notes: metafield(namespace: "custom", key: "middle_notes") { value }
            middlenotes: metafield(namespace: "custom", key: "middlenotes") { value }
            base_notes: metafield(namespace: "custom", key: "base_notes") { value }
            basenotes: metafield(namespace: "custom", key: "basenotes") { value }
            idealfor: metafield(namespace: "custom", key: "idealfor") { value }
            ideal_for: metafield(namespace: "custom", key: "ideal_for") { value }
            size: metafield(namespace: "custom", key: "size") { value }
            rating: metafield(namespace: "reviews", key: "rating") { value }
            rating_count: metafield(namespace: "reviews", key: "rating_count") { value }
            jdgm_rating: metafield(namespace: "jdgm", key: "avg_rating") { value }
            jdgm_count: metafield(namespace: "jdgm", key: "review_count") { value }
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
      totalCount
    }
  }
`;


export const getProductByHandleQuery = `
  query getProductByHandle($handle: String!) {
    product(handle: $handle) {
      id
      title
      handle
      vendor
      tags
      productType
      availableForSale
      description
      descriptionHtml
      ${generateMetafieldFragment()}
      priceRange {
        minVariantPrice {
          amount
          currencyCode
        }
      }
      compareAtPriceRange {
        minVariantPrice {
          amount
        }
      }
      images(first: 5) {
        edges {
          node {
            url
            altText
          }
        }
      }
      variants(first: 10) {
        edges {
          node {
            id
            title
            availableForSale
            quantityAvailable
            price {
              amount
              currencyCode
            }
          }
        }
      }
    }
  }
`;

export const getProductRecommendationsQuery = `
  query getProductRecommendations($productId: ID!) {
    productRecommendations(productId: $productId) {
      id
      title
      handle
      vendor
      tags
      productType
      availableForSale
      featuredImage {
        url
        altText
      }
      priceRange {
        minVariantPrice {
          amount
          currencyCode
        }
      }
      compareAtPriceRange {
        minVariantPrice {
          amount
        }
      }
      variants(first: 1) {
        edges {
          node {
            id
            quantityAvailable
          }
        }
      }
      rating: metafield(namespace: "reviews", key: "rating") { value }
      rating_count: metafield(namespace: "reviews", key: "rating_count") { value }
      jdgm_rating: metafield(namespace: "jdgm", key: "avg_rating") { value }
      jdgm_count: metafield(namespace: "jdgm", key: "review_count") { value }
    }
  }
`;

export const getVendorsQuery = `
  query getVendors {
    products(first: 250) {
      edges {
        node {
          vendor
        }
      }
    }
  }
`;

export const getBlogQuery = `
  query getBlog($handle: String!, $first: Int!) {
    blog(handle: $handle) {
      title
      articles(first: $first, sortKey: PUBLISHED_AT, reverse: true) {
        edges {
          node {
            id
            title
            handle
            excerpt
            publishedAt
            image {
              url
              altText
            }
            authorV2 {
              name
            }
          }
        }
      }
    }
  }
`;

export const getArticleByHandleQuery = `
  query getArticle($blogHandle: String!, $articleHandle: String!) {
    blog(handle: $blogHandle) {
      articleByHandle(handle: $articleHandle) {
        id
        title
        contentHtml
        publishedAt
        image {
          url
          altText
        }
        authorV2 {
          name
        }
      }
    }
  }
`;

export const cartCreateMutation = `
  mutation cartCreate($input: CartInput!) {
    cartCreate(input: $input) {
      cart {
        id
        checkoutUrl
        totalQuantity
        discountCodes {
          code
          applicable
        }
        cost {
          totalAmount {
            amount
            currencyCode
          }
          subtotalAmount {
            amount
            currencyCode
          }
        }
        lines(first: 100) {
          edges {
            node {
              id
              quantity
              cost {
                totalAmount {
                  amount
                  currencyCode
                }
              }
              discountAllocations {
                discountedAmount {
                  amount
                  currencyCode
                }
              }
              merchandise {
                ... on ProductVariant {
                  id
                  title
                  quantityAvailable
                  requiresShipping
                  price {
                    amount
                  }
                  compareAtPrice {
                    amount
                  }
                  product {
                    id
                    title
                    handle
                    featuredImage {
                      url
                      altText
                    }
                  }
                }
              }
            }
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const cartBuyerIdentityUpdateMutation = `
  mutation cartBuyerIdentityUpdate($cartId: ID!, $buyerIdentity: CartBuyerIdentityInput!) {
    cartBuyerIdentityUpdate(cartId: $cartId, buyerIdentity: $buyerIdentity) {
      cart {
        id
        checkoutUrl
        totalQuantity
        cost {
          totalAmount {
            amount
            currencyCode
          }
          subtotalAmount {
            amount
            currencyCode
          }
        }
        lines(first: 100) {
          edges {
            node {
              id
              quantity
              cost {
                totalAmount {
                  amount
                  currencyCode
                }
              }
              merchandise {
                ... on ProductVariant {
                  id
                  title
                  quantityAvailable
                  requiresShipping
                  price {
                    amount
                  }
                  compareAtPrice {
                    amount
                  }
                  product {
                    id
                    title
                    handle
                    featuredImage {
                      url
                      altText
                    }
                  }
                }
              }
            }
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const searchProductsQuery = `
  query searchProducts($query: String!, $first: Int!, $sortKey: SearchSortKeys, $reverse: Boolean) {
    search(query: $query, first: $first, types: PRODUCT, sortKey: $sortKey, reverse: $reverse) {
      totalCount
      edges {
        node {
          ... on Product {
            id
            title
            handle
            vendor
            productType
            availableForSale
            description
            featuredImage {
              url
              altText
            }
            priceRange {
              minVariantPrice {
                amount
                currencyCode
              }
              maxVariantPrice {
                amount
                currencyCode
              }
            }
            variants(first: 1) {
              edges {
                node {
                  id
                  availableForSale
                  quantityAvailable
                }
              }
            }
          }
        }
      }
    }
  }
`;

export const getProductTypesQuery = `
  query getProductTypes {
    productTypes(first: 50) {
      edges {
        node
      }
    }
  }
`;

export const customerCreateMutation = `
  mutation customerCreate($input: CustomerCreateInput!) {
    customerCreate(input: $input) {
      customer {
        id
        email
      }
      customerUserErrors {
        code
        field
        message
      }
    }
  }
`;

export const customerAccessTokenCreateMutation = `
  mutation customerAccessTokenCreate($input: CustomerAccessTokenCreateInput!) {
    customerAccessTokenCreate(input: $input) {
      customerAccessToken {
        accessToken
        expiresAt
      }
      customerUserErrors {
        code
        field
        message
      }
    }
  }
`;

export const customerRecoverMutation = `
  mutation customerRecover($email: String!) {
    customerRecover(email: $email) {
      customerUserErrors {
        code
        field
        message
      }
    }
  }
`;

export const customerResetByUrlMutation = `
  mutation customerResetByUrl($resetUrl: URL!, $password: String!) {
    customerResetByUrl(resetUrl: $resetUrl, password: $password) {
      customer {
        id
        email
      }
      customerAccessToken {
        accessToken
        expiresAt
      }
      customerUserErrors {
        code
        field
        message
      }
    }
  }
`;
export const customerAccessTokenDeleteMutation = `
  mutation customerAccessTokenDelete($customerAccessToken: String!) {
    customerAccessTokenDelete(customerAccessToken: $customerAccessToken) {
      deletedAccessToken
      deletedCustomerAccessTokenId
      userErrors {
        field
        message
      }
}
  }
`;

export const customerUpdateMutation = `
  mutation customerUpdate($customerAccessToken: String!, $customer: CustomerUpdateInput!) {
    customerUpdate(customerAccessToken: $customerAccessToken, customer: $customer) {
      customer {
        id
        firstName
        lastName
        email
        phone
      }
      customerUserErrors {
        code
        field
        message
      }
    }
  }
`;

export const customerAddressCreateMutation = `
  mutation customerAddressCreate($customerAccessToken: String!, $address: MailingAddressInput!) {
    customerAddressCreate(customerAccessToken: $customerAccessToken, address: $address) {
      customerAddress {
        id
      }
      customerUserErrors {
        code
        field
        message
      }
    }
  }
`;

export const customerAddressUpdateMutation = `
  mutation customerAddressUpdate($customerAccessToken: String!, $id: ID!, $address: MailingAddressInput!) {
    customerAddressUpdate(customerAccessToken: $customerAccessToken, id: $id, address: $address) {
      customerAddress {
        id
      }
      customerUserErrors {
        code
        field
        message
      }
    }
  }
`;

export const customerAddressDeleteMutation = `
  mutation customerAddressDelete($customerAccessToken: String!, $id: ID!) {
    customerAddressDelete(customerAccessToken: $customerAccessToken, id: $id) {
      deletedCustomerAddressId
      customerUserErrors {
        code
        field
        message
      }
    }
  }
`;

export const customerDefaultAddressUpdateMutation = `
  mutation customerDefaultAddressUpdate($customerAccessToken: String!, $addressId: ID!) {
    customerDefaultAddressUpdate(customerAccessToken: $customerAccessToken, addressId: $addressId) {
      customer {
        id
      }
      customerUserErrors {
        code
        field
        message
      }
    }
  }
`;

export const getCartQuery = `
  query getCart($cartId: ID!) {
    cart(id: $cartId) {
      id
      checkoutUrl
      totalQuantity
      discountCodes {
        code
        applicable
      }
      cost {
        totalAmount {
          amount
          currencyCode
        }
        subtotalAmount {
          amount
          currencyCode
        }
      }
      lines(first: 100) {
        edges {
          node {
            id
            quantity
            cost {
              totalAmount {
                amount
                currencyCode
              }
            }
            discountAllocations {
              discountedAmount {
                amount
                currencyCode
              }
            }
            merchandise {
              ... on ProductVariant {
                id
                title
                quantityAvailable
                requiresShipping
                price {
                  amount
                }
                compareAtPrice {
                  amount
                }
                product {
                  id
                  title
                  handle
                  featuredImage {
                    url
                    altText
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

export const cartLinesAddMutation = `
  mutation cartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart {
        id
        totalQuantity
        discountCodes {
          code
          applicable
        }
        cost {
          totalAmount {
            amount
            currencyCode
          }
          subtotalAmount {
            amount
            currencyCode
          }
        }
        lines(first: 100) {
          edges {
            node {
              id
              quantity
              cost {
                totalAmount {
                  amount
                  currencyCode
                }
              }
              discountAllocations {
                discountedAmount {
                  amount
                  currencyCode
                }
              }
              merchandise {
                ... on ProductVariant {
                  id
                  title
                  quantityAvailable
                  requiresShipping
                  price {
                    amount
                  }
                  compareAtPrice {
                    amount
                  }
                  product {
                    id
                    title
                    handle
                    featuredImage {
                      url
                      altText
                    }
                  }
                }
              }
            }
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const cartLinesUpdateMutation = `
  mutation cartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
    cartLinesUpdate(cartId: $cartId, lines: $lines) {
      cart {
        id
        totalQuantity
        discountCodes {
          code
          applicable
        }
        cost {
          totalAmount {
            amount
            currencyCode
          }
          subtotalAmount {
            amount
            currencyCode
          }
        }
        lines(first: 100) {
          edges {
            node {
              id
              quantity
              cost {
                totalAmount {
                  amount
                  currencyCode
                }
              }
              discountAllocations {
                discountedAmount {
                  amount
                  currencyCode
                }
              }
              merchandise {
                ... on ProductVariant {
                  id
                  title
                  quantityAvailable
                  requiresShipping
                  price {
                    amount
                  }
                  compareAtPrice {
                    amount
                  }
                  product {
                    id
                    title
                    handle
                    featuredImage {
                      url
                      altText
                    }
                  }
                }
              }
            }
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const cartLinesRemoveMutation = `
  mutation cartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
    cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
      cart {
        id
        totalQuantity
        discountCodes {
          code
          applicable
        }
        cost {
          totalAmount {
            amount
            currencyCode
          }
          subtotalAmount {
            amount
            currencyCode
          }
        }
        lines(first: 100) {
          edges {
            node {
              id
              quantity
              cost {
                totalAmount {
                  amount
                  currencyCode
                }
              }
              discountAllocations {
                discountedAmount {
                  amount
                  currencyCode
                }
              }
              merchandise {
                ... on ProductVariant {
                  id
                  title
                  quantityAvailable
                  requiresShipping
                  price {
                    amount
                  }
                  compareAtPrice {
                    amount
                  }
                  product {
                    id
                    title
                    handle
                    featuredImage {
                      url
                      altText
                    }
                  }
                }
              }
            }
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const cartDiscountCodesUpdateMutation = `
  mutation cartDiscountCodesUpdate($cartId: ID!, $discountCodes: [String!]) {
    cartDiscountCodesUpdate(cartId: $cartId, discountCodes: $discountCodes) {
      cart {
        id
        checkoutUrl
        totalQuantity
        discountCodes {
          code
          applicable
        }
        cost {
          totalAmount {
            amount
            currencyCode
          }
          subtotalAmount {
            amount
            currencyCode
          }
        }
        lines(first: 100) {
          edges {
            node {
              id
              quantity
              cost {
                totalAmount {
                  amount
                  currencyCode
                }
              }
              discountAllocations {
                discountedAmount {
                  amount
                  currencyCode
                }
              }
              merchandise {
                ... on ProductVariant {
                  id
                  title
                  quantityAvailable
                  requiresShipping
                  price {
                    amount
                  }
                  compareAtPrice {
                    amount
                  }
                  product {
                    id
                    title
                    handle
                    featuredImage {
                      url
                      altText
                    }
                  }
                }
              }
            }
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const getCustomerQuery = `
  query getCustomer($customerAccessToken: String!) {
    customer(customerAccessToken: $customerAccessToken) {
      id
      firstName
      lastName
      email
      phone
      createdAt
      tags
      defaultAddress {
        id
        firstName
        lastName
        address1
        address2
        city
        province
        zip
        country
        phone
      }
      addresses(first: 10) {
        edges {
          node {
            id
            firstName
            lastName
            address1
            address2
            city
            province
            zip
            country
            phone
          }
        }
      }
      orders(first: 20, sortKey: PROCESSED_AT, reverse: true) {
        edges {
          node {
            id
            name
            processedAt
            fulfillmentStatus
            financialStatus
            statusUrl
            totalPrice { amount currencyCode }
            subtotalPrice { amount currencyCode }
            totalTax { amount currencyCode }
            totalShippingPrice { amount }
            shippingAddress {
              firstName
              lastName
              address1
              address2
              city
              province
              zip
              country
              phone
            }
            lineItems(first: 20) {
              edges {
                node {
                  title
                  quantity
                  originalTotalPrice { amount currencyCode }
                  variant {
                    title
                    image { url altText }
                    sku
                    price {
                      amount
                    }
                    compareAtPrice {
                      amount
                    }
                    product { handle }
                  }
                }
              }
            }
          }
        }
      }
      wishlist: metafield(namespace: "custom", key: "wishlist") {
        value
      }
      is_subscribed: metafield(namespace: "custom", key: "is_subscribed") {
        value
      }
      gender: metafield(namespace: "custom", key: "gender") {
        value
      }
    }
  }
`;
