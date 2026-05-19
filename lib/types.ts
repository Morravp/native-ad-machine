export interface Brand {
  id: string
  name: string
  countries: string[]
  extra_rules: string | null
  notes: string | null
  ad_count: number
  created_at: string
}

export interface BrandDoc {
  id: string
  brand_id: string
  name: string
  type: 'product' | 'persona'
  content: string
  created_at: string
}

export interface GlobalRule {
  id: string
  rule_text: string
  order_index: number
  created_at: string
}

export interface FormatExample {
  id: string
  label: string
  file_name: string
  content: string
  created_at: string
}

export interface Ad {
  id: string
  ad_id: string
  brand_id: string
  country: string
  badge_number: number
  body: string
  competitor_ad: string | null
  extra_context: string | null
  extra_doc_texts: string[] | null
  created_at: string
  brand_name?: string
}
