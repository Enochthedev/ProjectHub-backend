import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResponseTemplate } from '../entities/response-template.entity';
import { KnowledgeBaseEntry } from '../entities/knowledge-base-entry.entity';

export interface LocalizationContext {
  userLanguage?: string;
  detectedLanguage?: string;
  preferredLanguage?: string;
  projectPhase?: string;
  specialization?: string;
}

export interface LocalizedResponse {
  content: string;
  language: string;
  translationMethod: 'template' | 'ai' | 'fallback';
  confidence: number;
  originalLanguage?: string;
  metadata?: Record<string, any>;
}

export interface TranslationRequest {
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
  context?: LocalizationContext;
  preserveFormatting?: boolean;
}

@Injectable()
export class ResponseLocalizationService {
  private readonly logger = new Logger(ResponseLocalizationService.name);

  // Language-specific response templates
  private readonly responseTemplates = {
    en: {
      greeting: "Hello! I'm here to help you with your Final Year Project.",
      fallback:
        "I'm not able to provide a confident answer to your question right now. However, I can help you in other ways:",
      escalation:
        'Consider contacting your supervisor or academic advisor for this specific question.',
      suggestions: 'Here are some suggestions:',
      error:
        'I encountered an error while processing your request. Please try again.',
      lowConfidence:
        "I'm not entirely sure about this answer. You might want to verify this information with your supervisor.",
    },
    es: {
      greeting:
        '¡Hola! Estoy aquí para ayudarte con tu Proyecto de Fin de Carrera.',
      fallback:
        'No puedo proporcionar una respuesta confiable a tu pregunta en este momento. Sin embargo, puedo ayudarte de otras maneras:',
      escalation:
        'Considera contactar a tu supervisor o asesor académico para esta pregunta específica.',
      suggestions: 'Aquí tienes algunas sugerencias:',
      error:
        'Encontré un error al procesar tu solicitud. Por favor, inténtalo de nuevo.',
      lowConfidence:
        'No estoy completamente seguro de esta respuesta. Podrías querer verificar esta información con tu supervisor.',
    },
    fr: {
      greeting:
        "Bonjour ! Je suis là pour vous aider avec votre Projet de Fin d'Études.",
      fallback:
        "Je ne peux pas fournir une réponse fiable à votre question pour le moment. Cependant, je peux vous aider d'autres façons :",
      escalation:
        'Considérez contacter votre superviseur ou conseiller académique pour cette question spécifique.',
      suggestions: 'Voici quelques suggestions :',
      error:
        "J'ai rencontré une erreur lors du traitement de votre demande. Veuillez réessayer.",
      lowConfidence:
        'Je ne suis pas entièrement sûr de cette réponse. Vous pourriez vouloir vérifier cette information avec votre superviseur.',
    },
    de: {
      greeting:
        'Hallo! Ich bin hier, um Ihnen bei Ihrem Abschlussprojekt zu helfen.',
      fallback:
        'Ich kann derzeit keine zuverlässige Antwort auf Ihre Frage geben. Ich kann Ihnen jedoch auf andere Weise helfen:',
      escalation:
        'Erwägen Sie, Ihren Betreuer oder akademischen Berater für diese spezifische Frage zu kontaktieren.',
      suggestions: 'Hier sind einige Vorschläge:',
      error:
        'Ich bin auf einen Fehler bei der Verarbeitung Ihrer Anfrage gestoßen. Bitte versuchen Sie es erneut.',
      lowConfidence:
        'Ich bin mir bei dieser Antwort nicht ganz sicher. Sie sollten diese Information mit Ihrem Betreuer überprüfen.',
    },
    pt: {
      greeting:
        'Olá! Estou aqui para ajudá-lo com seu Projeto de Conclusão de Curso.',
      fallback:
        'Não consigo fornecer uma resposta confiável para sua pergunta no momento. No entanto, posso ajudá-lo de outras maneiras:',
      escalation:
        'Considere entrar em contato com seu orientador ou conselheiro acadêmico para esta pergunta específica.',
      suggestions: 'Aqui estão algumas sugestões:',
      error:
        'Encontrei um erro ao processar sua solicitação. Por favor, tente novamente.',
      lowConfidence:
        'Não tenho certeza completa sobre esta resposta. Você pode querer verificar esta informação com seu orientador.',
    },
    it: {
      greeting: 'Ciao! Sono qui per aiutarti con il tuo Progetto di Tesi.',
      fallback:
        'Non riesco a fornire una risposta affidabile alla tua domanda in questo momento. Tuttavia, posso aiutarti in altri modi:',
      escalation:
        'Considera di contattare il tuo supervisore o consulente accademico per questa domanda specifica.',
      suggestions: 'Ecco alcuni suggerimenti:',
      error:
        "Ho riscontrato un errore durante l'elaborazione della tua richiesta. Per favore, riprova.",
      lowConfidence:
        'Non sono completamente sicuro di questa risposta. Potresti voler verificare queste informazioni con il tuo supervisore.',
    },
  };

  // Academic terminology translations
  private readonly academicTerms = {
    en: {
      'literature review': 'literature review',
      methodology: 'methodology',
      'research question': 'research question',
      hypothesis: 'hypothesis',
      'data analysis': 'data analysis',
      conclusion: 'conclusion',
      bibliography: 'bibliography',
      abstract: 'abstract',
      introduction: 'introduction',
      supervisor: 'supervisor',
    },
    es: {
      'literature review': 'revisión de literatura',
      methodology: 'metodología',
      'research question': 'pregunta de investigación',
      hypothesis: 'hipótesis',
      'data analysis': 'análisis de datos',
      conclusion: 'conclusión',
      bibliography: 'bibliografía',
      abstract: 'resumen',
      introduction: 'introducción',
      supervisor: 'supervisor',
    },
    fr: {
      'literature review': 'revue de littérature',
      methodology: 'méthodologie',
      'research question': 'question de recherche',
      hypothesis: 'hypothèse',
      'data analysis': 'analyse de données',
      conclusion: 'conclusion',
      bibliography: 'bibliographie',
      abstract: 'résumé',
      introduction: 'introduction',
      supervisor: 'superviseur',
    },
    de: {
      'literature review': 'Literaturübersicht',
      methodology: 'Methodik',
      'research question': 'Forschungsfrage',
      hypothesis: 'Hypothese',
      'data analysis': 'Datenanalyse',
      conclusion: 'Schlussfolgerung',
      bibliography: 'Bibliographie',
      abstract: 'Zusammenfassung',
      introduction: 'Einleitung',
      supervisor: 'Betreuer',
    },
    pt: {
      'literature review': 'revisão de literatura',
      methodology: 'metodologia',
      'research question': 'questão de pesquisa',
      hypothesis: 'hipótese',
      'data analysis': 'análise de dados',
      conclusion: 'conclusão',
      bibliography: 'bibliografia',
      abstract: 'resumo',
      introduction: 'introdução',
      supervisor: 'orientador',
    },
    it: {
      'literature review': 'revisione della letteratura',
      methodology: 'metodologia',
      'research question': 'domanda di ricerca',
      hypothesis: 'ipotesi',
      'data analysis': 'analisi dei dati',
      conclusion: 'conclusione',
      bibliography: 'bibliografia',
      abstract: 'riassunto',
      introduction: 'introduzione',
      supervisor: 'supervisore',
    },
  };

  constructor(
    @InjectRepository(ResponseTemplate)
    private readonly templateRepository: Repository<ResponseTemplate>,
    @InjectRepository(KnowledgeBaseEntry)
    private readonly knowledgeRepository: Repository<KnowledgeBaseEntry>,
  ) {}

  /**
   * Localize a response to the target language
   */
  async localizeResponse(
    content: string,
    targetLanguage: string,
    context: LocalizationContext = {},
  ): Promise<LocalizedResponse> {
    this.logger.debug(`Localizing response to ${targetLanguage}`);

    // If target language is English or not supported, return as-is
    if (targetLanguage === 'en' || !this.isLanguageSupported(targetLanguage)) {
      return {
        content,
        language: 'en',
        translationMethod: 'fallback',
        confidence: 1.0,
        originalLanguage: 'en',
      };
    }

    try {
      // Try to find existing template in target language
      const templateResponse = await this.findLocalizedTemplate(
        content,
        targetLanguage,
        context,
      );
      if (templateResponse) {
        return templateResponse;
      }

      // Try to translate using academic terminology
      const translatedContent = this.translateAcademicContent(
        content,
        targetLanguage,
      );

      return {
        content: translatedContent,
        language: targetLanguage,
        translationMethod: 'ai',
        confidence: 0.8,
        originalLanguage: 'en',
        metadata: {
          translatedAt: new Date().toISOString(),
          method: 'academic_terminology',
        },
      };
    } catch (error) {
      this.logger.error(`Error localizing response: ${error.message}`);

      // Return fallback response in target language
      return this.getFallbackResponse(targetLanguage, context);
    }
  }

  /**
   * Get a fallback response in the specified language
   */
  getFallbackResponse(
    language: string,
    context: LocalizationContext = {},
  ): LocalizedResponse {
    const templates =
      this.responseTemplates[language] || this.responseTemplates.en;

    let content = templates.fallback;

    // Add context-specific suggestions
    if (context.projectPhase) {
      const suggestions = this.getPhaseSpecificSuggestions(
        context.projectPhase,
        language,
      );
      content += '\n\n' + templates.suggestions + '\n' + suggestions.join('\n');
    }

    return {
      content,
      language,
      translationMethod: 'template',
      confidence: 1.0,
      metadata: {
        templateType: 'fallback',
        context,
      },
    };
  }

  /**
   * Translate academic content using terminology mapping
   */
  private translateAcademicContent(
    content: string,
    targetLanguage: string,
  ): string {
    let translatedContent = content;
    const terms = this.academicTerms[targetLanguage];

    if (!terms) {
      return content;
    }

    // Replace academic terms
    for (const [englishTerm, translatedTerm] of Object.entries(terms)) {
      const regex = new RegExp(`\\b${englishTerm}\\b`, 'gi');
      translatedContent = translatedContent.replace(
        regex,
        translatedTerm as string,
      );
    }

    // Apply language-specific formatting
    translatedContent = this.applyLanguageFormatting(
      translatedContent,
      targetLanguage,
    );

    return translatedContent;
  }

  /**
   * Apply language-specific formatting rules
   */
  private applyLanguageFormatting(content: string, language: string): string {
    switch (language) {
      case 'es':
        // Spanish formatting rules
        content = content.replace(/\?/g, '¿') + '?';
        content = content.replace(/!/g, '¡') + '!';
        break;
      case 'fr':
        // French formatting rules (add spaces before punctuation)
        content = content.replace(/([!?:;])/g, ' $1');
        break;
      case 'de':
        // German formatting rules (capitalize nouns - basic implementation)
        // This is a simplified version - real German capitalization is complex
        break;
    }

    return content;
  }

  /**
   * Find existing localized template
   */
  private async findLocalizedTemplate(
    content: string,
    language: string,
    context: LocalizationContext,
  ): Promise<LocalizedResponse | null> {
    try {
      // Search for templates in the target language
      const templates = await this.templateRepository.find({
        where: {
          language,
          isActive: true,
        },
      });

      // Find best matching template based on content similarity
      for (const template of templates) {
        const similarity = this.calculateContentSimilarity(
          content,
          template.template,
        );
        if (similarity > 0.7) {
          const processedTemplate = this.processTemplate(
            template.template,
            context,
          );

          return {
            content: processedTemplate,
            language,
            translationMethod: 'template',
            confidence: similarity,
            metadata: {
              templateId: template.id,
              templateName: template.name,
              similarity,
            },
          };
        }
      }

      return null;
    } catch (error) {
      this.logger.error(`Error finding localized template: ${error.message}`);
      return null;
    }
  }

  /**
   * Process template with variable substitution
   */
  private processTemplate(
    template: string,
    context: LocalizationContext,
  ): string {
    let processedTemplate = template;

    // Replace context variables
    if (context.specialization) {
      processedTemplate = processedTemplate.replace(
        /\{specialization\}/g,
        context.specialization,
      );
    }

    if (context.projectPhase) {
      processedTemplate = processedTemplate.replace(
        /\{projectPhase\}/g,
        context.projectPhase,
      );
    }

    // Replace common variables
    processedTemplate = processedTemplate.replace(
      /\{currentDate\}/g,
      new Date().toLocaleDateString(),
    );

    return processedTemplate;
  }

  /**
   * Calculate content similarity between two texts
   */
  private calculateContentSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));

    const intersection = new Set([...words1].filter((x) => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  /**
   * Get phase-specific suggestions in the target language
   */
  private getPhaseSpecificSuggestions(
    phase: string,
    language: string,
  ): string[] {
    const suggestions = {
      en: {
        literature_review: [
          '• Search for recent academic papers in your field',
          '• Organize sources by themes or methodologies',
          '• Critically analyze existing research gaps',
        ],
        methodology: [
          '• Choose appropriate research methods for your question',
          '• Consider ethical implications of your research',
          '• Plan your data collection strategy',
        ],
        implementation: [
          '• Break down your project into manageable tasks',
          '• Document your progress regularly',
          '• Test your solution incrementally',
        ],
      },
      es: {
        literature_review: [
          '• Busca artículos académicos recientes en tu campo',
          '• Organiza las fuentes por temas o metodologías',
          '• Analiza críticamente las brechas de investigación existentes',
        ],
        methodology: [
          '• Elige métodos de investigación apropiados para tu pregunta',
          '• Considera las implicaciones éticas de tu investigación',
          '• Planifica tu estrategia de recolección de datos',
        ],
        implementation: [
          '• Divide tu proyecto en tareas manejables',
          '• Documenta tu progreso regularmente',
          '• Prueba tu solución de forma incremental',
        ],
      },
    };

    const langSuggestions = suggestions[language] || suggestions.en;
    return langSuggestions[phase] || langSuggestions.literature_review;
  }

  /**
   * Check if language is supported
   */
  private isLanguageSupported(language: string): boolean {
    return ['en', 'es', 'fr', 'de', 'pt', 'it'].includes(language);
  }

  /**
   * Get greeting message in specified language
   */
  getGreeting(
    language: string,
    context: LocalizationContext = {},
  ): LocalizedResponse {
    const templates =
      this.responseTemplates[language] || this.responseTemplates.en;

    return {
      content: templates.greeting,
      language,
      translationMethod: 'template',
      confidence: 1.0,
      metadata: {
        templateType: 'greeting',
        context,
      },
    };
  }

  /**
   * Get error message in specified language
   */
  getErrorMessage(
    language: string,
    errorType: string = 'general',
  ): LocalizedResponse {
    const templates =
      this.responseTemplates[language] || this.responseTemplates.en;

    let content = templates.error;

    if (errorType === 'low_confidence') {
      content = templates.lowConfidence;
    }

    return {
      content,
      language,
      translationMethod: 'template',
      confidence: 1.0,
      metadata: {
        templateType: 'error',
        errorType,
      },
    };
  }

  /**
   * Batch localize multiple responses
   */
  async localizeResponseBatch(
    responses: Array<{
      content: string;
      targetLanguage: string;
      context?: LocalizationContext;
    }>,
  ): Promise<LocalizedResponse[]> {
    const results: LocalizedResponse[] = [];

    for (const response of responses) {
      const localized = await this.localizeResponse(
        response.content,
        response.targetLanguage,
        response.context,
      );
      results.push(localized);
    }

    return results;
  }

  /**
   * Get supported languages with their names
   */
  getSupportedLanguages(): Array<{ code: string; name: string }> {
    return [
      { code: 'en', name: 'English' },
      { code: 'es', name: 'Español' },
      { code: 'fr', name: 'Français' },
      { code: 'de', name: 'Deutsch' },
      { code: 'pt', name: 'Português' },
      { code: 'it', name: 'Italiano' },
    ];
  }
}
