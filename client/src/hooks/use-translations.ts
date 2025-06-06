import { useLanguage } from '@/contexts/LanguageContext';

export function useTranslations() {
  const { t, language } = useLanguage();

  // Utility function to format numbers based on language
  const formatNumber = (num: number): string => {
    if (language === 'hi') {
      return new Intl.NumberFormat('hi-IN').format(num);
    } else if (language === 'te') {
      return new Intl.NumberFormat('te-IN').format(num);
    }
    return new Intl.NumberFormat('en-US').format(num);
  };

  // Utility function to format currency
  const formatCurrency = (amount: number): string => {
    const formatted = formatNumber(amount);
    if (language === 'hi') {
      return `₹${formatted}`;
    } else if (language === 'te') {
      return `₹${formatted}`;
    }
    return `₹${formatted}`;
  };

  // Utility function to format dates
  const formatDate = (date: string | Date): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (language === 'hi') {
      return dateObj.toLocaleDateString('hi-IN');
    } else if (language === 'te') {
      return dateObj.toLocaleDateString('te-IN');
    }
    return dateObj.toLocaleDateString('en-US');
  };

  return {
    t,
    language,
    formatNumber,
    formatCurrency,
    formatDate,
  };
}