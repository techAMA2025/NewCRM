import { useState, useEffect } from 'react'
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore'
import { db } from '@/firebase/firebase'

interface WhatsAppTemplate {
  id: string
  name: string
  templateName: string
  description: string
  type: 'advocate' | 'sales'
  isActive: boolean
  createdAt: any
  updatedAt: any
}

interface UseWhatsAppTemplatesReturn {
  templates: WhatsAppTemplate[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export const useWhatsAppTemplates = (type?: 'advocate' | 'sales'): UseWhatsAppTemplatesReturn => {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTemplates = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const templatesRef = collection(db, 'whatsappTemplates')
      
      // Build query with optional type filter and active templates only
      let q = query(
        templatesRef, 
        where('isActive', '==', true),
        orderBy('name', 'asc')
      )
      
      // If type is specified, add type filter
      if (type) {
        q = query(
          templatesRef,
          where('type', '==', type),
          where('isActive', '==', true),
          orderBy('name', 'asc')
        )
      }
      
      const snapshot = await getDocs(q)
      
      const templatesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as WhatsAppTemplate[]
      
      setTemplates(templatesData)
    } catch (err) {
      console.error('Error fetching templates:', err)
      setError('Failed to fetch templates')
      // Fallback to default templates if Firebase fails
      setTemplates(getDefaultTemplates(type))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTemplates()
  }, [type])

  const refetch = async () => {
    await fetchTemplates()
  }

  return { templates, loading, error, refetch }
}

// Fallback default templates
const getDefaultTemplates = (type?: 'advocate' | 'sales'): WhatsAppTemplate[] => {
  const salesTemplates = [
    {
      id: 'default-1',
      name: "CIBIL",
      templateName: "ama_dashboard_credit_report",
      description: "Send CIBIL credit report information",
      type: 'sales' as const,
      isActive: true,
      createdAt: null,
      updatedAt: null
    },
    {
      id: 'default-2',
      name: "Answered Call",
      templateName: "ama_dashboard_after_call",
      description: "Follow-up after answered call",
      type: 'sales' as const,
      isActive: true,
      createdAt: null,
      updatedAt: null
    },
    {
      id: 'default-3',
      name: "Loan Settlement?",
      templateName: "ama_dashboard_loan_settlement1",
      description: "Ask about loan settlement",
      type: 'sales' as const,
      isActive: true,
      createdAt: null,
      updatedAt: null
    },
    {
      id: 'default-4',
      name: "No Answer",
      templateName: "ama_dashboard_no_answer",
      description: "Follow-up for unanswered calls",
      type: 'sales' as const,
      isActive: true,
      createdAt: null,
      updatedAt: null
    },
    {
      id: 'default-5',
      name: "What we do?",
      templateName: "ama_dashboard_struggling1",
      description: "Explain what AMA Legal Solutions does",
      type: 'sales' as const,
      isActive: true,
      createdAt: null,
      updatedAt: null
    }
  ]

  const advocateTemplates = [
    {
      id: 'default-advocate-1',
      name: "Send Feedback Message",
      templateName: "advocate_feedback_20250801",
      description: "Send feedback request message to client",
      type: 'advocate' as const,
      isActive: true,
      createdAt: null,
      updatedAt: null
    }
  ]

  if (type === 'sales') return salesTemplates
  if (type === 'advocate') return advocateTemplates
  return [...salesTemplates, ...advocateTemplates]
} 