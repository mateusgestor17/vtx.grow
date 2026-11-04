// Playbook da Jornada do Consumidor — metodologia Vortex, personalizada com os dados da empresa.
import type { Analysis, Stage, Step } from './engine';

export interface StagePlaybook { objective: string; steps: Step[]; kpis: string[]; tools: string[]; mistakes: string[] }

export function journeyPlaybook(an: Analysis): Record<Stage, StagePlaybook> {
  const offer = an.company.priorityOffer;
  const offerLow = offer.toLowerCase();
  const city = an.company.city ? an.company.city.split(' - ')[0] : 'sua cidade';
  const name = an.company.name;
  return {
    descoberta: {
      objective: `Fazer o cliente certo descobrir que a ${name} existe — no momento em que ele começa a procurar por ${offerLow}.`,
      steps: [
        { t: 'Mapeie onde seu cliente procura', d: 'Pergunte aos últimos 20 clientes: "Como você nos encontrou?" e "Onde você procurou antes?". Isso mostra quais canais priorizar.' },
        { t: 'Pesquise a demanda no Google', d: `No Planejador de Palavras-chave e no Google Trends, veja quantas pessoas buscam "${offerLow} ${city.toLowerCase()}" e variações por mês.` },
        { t: 'Analise 5 concorrentes', d: 'Veja os anúncios deles na Biblioteca de Anúncios da Meta, o Google Meu Negócio, as avaliações e o site. Anote ofertas, preços e pontos fracos.' },
        { t: 'Crie e otimize o Google Meu Negócio', d: 'Categoria correta, serviços, fotos reais e área de atendimento. É o que aparece no Maps quando alguém busca perto.' },
        { t: 'Organize o Instagram como vitrine', d: 'Foto de perfil com a logo, bio com promessa + cidade + CTA, link para WhatsApp/landing page e destaques: Serviços, Clientes, Antes/Depois, Dúvidas.' },
        { t: 'Ative a campanha de descoberta', d: 'Google Search para quem já procura, ou Meta Ads (alcance/vídeo) para quem ainda não sabe que precisa — conforme a recomendação de canais.' },
        { t: 'Garanta consistência', d: 'Mesmo nome, logo, telefone e endereço em todos os canais (Google, Instagram, site, Facebook, diretórios).' },
      ],
      kpis: ['Impressões e alcance', 'Buscas pela marca', 'Visualizações do Google Meu Negócio', 'Novos seguidores qualificados'],
      tools: ['Planejador de Palavras-chave', 'Google Trends', 'Biblioteca de Anúncios Meta', 'Google Perfil da Empresa'],
      mistakes: ['Estar em todos os canais pela metade', 'Postar sem estratégia', 'Ignorar o Google Meu Negócio'],
    },
    atencao: {
      objective: `Chamar a atenção com a mensagem certa e transformar a atenção em contato: um lead interessado em ${offerLow}.`,
      steps: [
        { t: 'Defina os ângulos de comunicação', d: 'Dor (o problema que incomoda), desejo (o resultado), prova (depoimentos), oferta (condição) e autoridade (experiência, bastidores).' },
        { t: 'Crie os criativos', d: 'Mínimo de 5 por mês: 2 vídeos curtos (15–30s, vertical, legendado), 1 carrossel, 1 antes/depois e 1 estático com a oferta.' },
        { t: 'Escreva os 3 primeiros segundos', d: 'O gancho decide se a pessoa para de rolar a tela: uma pergunta, um número, um resultado ou uma afirmação forte.' },
        { t: 'Monte a landing page de alta conversão', d: `Uma página só para "${offer}": promessa no topo, prova, como funciona, depoimentos, FAQ e botão de WhatsApp repetido.` },
        { t: 'Teste A/B toda semana', d: 'Teste um elemento por vez: criativo, título, público ou oferta. Mantenha o vencedor e crie um novo desafiante.' },
        { t: 'Rastreie cada clique', d: 'Pixel, GA4 e conversões configurados para saber exatamente qual anúncio gerou cada lead.' },
        { t: 'Leve o lead para o canal certo', d: 'Formulário com qualificação ou WhatsApp com mensagem automática — nunca deixe o lead "solto".' },
      ],
      kpis: ['CTR (taxa de cliques)', 'CPL (custo por lead)', 'Taxa de conversão da landing page', 'Custo por lead qualificado'],
      tools: ['Meta Ads', 'Google Ads', 'CapCut / Canva', 'Framer / WordPress + Elementor', 'GA4 + GTM'],
      mistakes: ['Usar sempre o mesmo criativo', 'Mandar o anúncio para a home do site', 'Julgar a campanha em 2 dias'],
    },
    consideracao: {
      objective: `Gerar confiança para o cliente escolher a ${name} e não o concorrente.`,
      steps: [
        { t: 'Google Meu Negócio com avaliações', d: 'Rotina de pedir avaliação a todo cliente atendido. Meta: nota acima de 4,7 e 4 a 8 novas avaliações por mês.' },
        { t: 'Fotos e vídeos reais', d: 'Equipe, estrutura, trabalhos realizados e bastidores. Foto de banco de imagem reduz confiança.' },
        { t: 'Depoimentos em vídeo', d: 'Roteiro: como era antes → por que escolheu → como foi → resultado. 30 a 60 segundos, legendado.' },
        { t: 'Cases no Instagram e no site', d: 'Problema → solução → resultado (de preferência com número). Destaque "Clientes" no Instagram e seção no site.' },
        { t: 'FAQ que responde objeções', d: 'Preço, prazo, garantia, forma de pagamento, área de atendimento e "por que vocês?".' },
        { t: 'Remarketing', d: 'Anúncios com depoimentos e quebra de objeções para quem visitou o site ou interagiu no Instagram e não comprou.' },
        { t: 'Material de apoio à venda', d: 'Apresentação curta (PDF ou vídeo) que o vendedor envia no follow-up.' },
      ],
      kpis: ['Nota e nº de avaliações no Google', 'Nº de depoimentos publicados', 'Taxa de resposta ao follow-up'],
      tools: ['Google Perfil da Empresa', 'Instagram (destaques)', 'Meta Ads (remarketing)'],
      mistakes: ['Não responder avaliações', 'Ter só depoimentos em texto sem nome', 'Esconder o preço sem explicar o valor'],
    },
    acao: {
      objective: 'Transformar interesse em venda com processo: velocidade, diagnóstico, proposta e follow-up.',
      steps: [
        { t: 'Diagnóstico comercial do processo atual', d: 'Escute 10 atendimentos reais: quanto tempo para responder, o que é perguntado, quando o preço aparece e onde o cliente desiste.' },
        { t: 'Formulário de qualificação', d: 'Urgência, orçamento, decisor e serviço. Leads quentes vão direto para o vendedor.' },
        { t: 'SLA de resposta de 5 minutos', d: 'WhatsApp Business com mensagem automática, respostas rápidas e responsável por turno.' },
        { t: 'Roteiro de atendimento', d: 'Abertura → diagnóstico (perguntas antes do preço) → apresentação conectada à dor → proposta → objeções → próximo passo com data.' },
        { t: 'Treinamento do time comercial', d: 'Simulações semanais de 30 minutos, análise de conversas reais e banco de respostas para objeções.' },
        { t: 'Planejamento comercial com metas reversas', d: 'Meta de faturamento → vendas → orçamentos → leads, quebrados por semana e por dia (veja a aba Metas e investimento).' },
        { t: 'CRM com pipeline e cadência de follow-up', d: 'Todo lead registrado, com origem, etapa e motivo de perda; cadência de 6 toques em 15 dias.' },
      ],
      kpis: ['Tempo de 1ª resposta', 'Conversão lead → orçamento', 'Conversão orçamento → venda', 'Motivos de perda'],
      tools: ['WhatsApp Business', 'Kommo / RD Station CRM / Pipedrive', 'Google Planilhas'],
      mistakes: ['Passar o preço antes de entender a necessidade', 'Não fazer follow-up', 'Não registrar por que o cliente não comprou'],
    },
    relacionamento: {
      objective: 'Encantar quem comprou para gerar recompra, avaliação e indicação — o cliente mais barato é o que já confia em você.',
      steps: [
        { t: 'Onboarding / boas-vindas', d: 'Mensagem de boas-vindas, alinhamento de expectativa e próximos passos logo após a compra.' },
        { t: 'Experiência de entrega', d: 'Atualize o cliente durante a entrega. Surpreenda com um detalhe (brinde, cartão, acompanhamento).' },
        { t: 'Pesquisa de satisfação (NPS)', d: '"De 0 a 10, quanto você nos recomendaria?" — enviada após a entrega.' },
        { t: 'Avaliação e depoimento', d: 'Quem deu nota 9 ou 10 recebe o link de avaliação no Google e o convite para gravar um depoimento.' },
        { t: 'Programa de indicação', d: 'Recompensa para quem indica e condição de boas-vindas para o indicado, com mensagem pronta para encaminhar.' },
        { t: 'Recompra e upsell', d: 'Mapeie a próxima compra natural (manutenção, complemento, upgrade) e agende o contato.' },
        { t: 'Reativação da base', d: 'A cada 90 dias, campanha no WhatsApp para ex-clientes e leads perdidos com uma oferta de retorno.' },
      ],
      kpis: ['NPS', 'Vendas por indicação', 'Taxa de recompra', 'Avaliações novas por mês'],
      tools: ['WhatsApp Business', 'Google Forms (NPS)', 'CRM'],
      mistakes: ['Sumir depois que o cliente paga', 'Pedir indicação sem oferecer nada', 'Não ter lista dos clientes antigos'],
    },
  };
}
