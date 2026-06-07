/*
==============================================
  CADASTRO DE MÓDULOS E AULAS
  EDITE APENAS ESTA ÁREA
==============================================

  Como adicionar ou editar uma aula:
  -----------------------------------
  1. Encontre o módulo correto dentro do array COURSE abaixo.
  2. Dentro de "lessons", localize a aula ou adicione uma nova.
  3. Altere os campos:
       - title : título que aparece na plataforma
       - desc  : descrição breve da aula
       - videoUrl : link EMBED do vídeo (ver instruções abaixo)

  Como transformar um link normal em link embed:
  -----------------------------------------------
  YouTube normal  → https://www.youtube.com/watch?v=CODIGO
  YouTube embed   → https://www.youtube.com/embed/CODIGO

  Vimeo normal    → https://vimeo.com/CODIGO
  Vimeo embed     → https://player.vimeo.com/video/CODIGO

  Panda Video     → https://player-vz-XXXX.tv.pandavideo.com.br/embed/?v=CODIGO
  Bunny Stream    → https://iframe.mediadelivery.net/embed/BIBLIOTECA/CODIGO

  Basta copiar o link embed e colar no campo videoUrl.

==============================================
*/

const COURSE = [
  {
    id: 'm1',
    n: 1,
    title: 'Boas-vindas ao Método 3Ps',
    desc: 'Conheça a plataforma, entenda a metodologia e prepare sua mentalidade para o crescimento.',
    lessons: [
      {
        id: 'm1l1',
        n: 1,
        title: 'Introdução à plataforma',
        desc: 'Nesta aula você conhecerá a plataforma Método 3Ps e aprenderá a navegar por todos os módulos e recursos disponíveis.',
        videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
      },
      {
        id: 'm1l2',
        n: 2,
        title: 'Como usar o método',
        desc: 'Entenda a estrutura dos 3Ps — Posicionamento, Prospecção e Performance — e como aplicar cada etapa na sua rotina.',
        videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
      },
      {
        id: 'm1l3',
        n: 3,
        title: 'Mentalidade do corretor digital',
        desc: 'Os princípios que diferenciam corretores comuns de corretores que faturam com consistência no ambiente digital.',
        videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
      }
    ]
  },

  {
    id: 'm2',
    n: 2,
    title: 'Posicionamento do Corretor Digital',
    desc: 'Construa autoridade, presença digital e gere confiança antes mesmo de falar sobre imóveis.',
    lessons: [
      {
        id: 'm2l1',
        n: 1,
        title: 'Como construir autoridade',
        desc: 'Estratégias práticas para se tornar referência no mercado imobiliário da sua região usando as redes sociais.',
        videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
      },
      {
        id: 'm2l2',
        n: 2,
        title: 'Como se posicionar no Instagram',
        desc: 'Perfil, bio, destaque de stories, feed e cadência de publicações — tudo que você precisa para dominar o Instagram.',
        videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
      },
      {
        id: 'm2l3',
        n: 3,
        title: 'Como gerar confiança antes da venda',
        desc: 'A venda começa muito antes do primeiro contato. Aprenda a preparar o terreno para um fechamento natural.',
        videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
      }
    ]
  },

  {
    id: 'm3',
    n: 3,
    title: 'Prospecção e Geração de Leads',
    desc: 'Métodos comprovados para atrair, abordar e organizar novos contatos todos os dias.',
    lessons: [
      {
        id: 'm3l1',
        n: 1,
        title: 'Como abordar contatos',
        desc: 'Scripts e abordagens que geram resposta. Saiba o que falar, como falar e quando falar com novos leads.',
        videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
      },
      {
        id: 'm3l2',
        n: 2,
        title: 'Como organizar sua base',
        desc: 'Um sistema simples para nunca mais perder um lead. Classificação, anotações e rotina de acompanhamento.',
        videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
      },
      {
        id: 'm3l3',
        n: 3,
        title: 'Como gerar oportunidades todos os dias',
        desc: 'A rotina do corretor digital: hábitos diários que mantêm o pipeline sempre cheio de boas oportunidades.',
        videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
      }
    ]
  },

  {
    id: 'm4',
    n: 4,
    title: 'Tráfego Pago para Corretores',
    desc: 'Aprenda a usar anúncios pagos para atrair leads qualificados e aumentar suas vendas de imóveis.',
    lessons: [
      {
        id: 'm4l1',
        n: 1,
        title: 'O que é tráfego pago no mercado imobiliário',
        desc: 'Entenda o conceito, por que funciona para corretores e como diferenciar tráfego pago de orgânico.',
        videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
      },
      {
        id: 'm4l2',
        n: 2,
        title: 'Como criar uma oferta simples',
        desc: 'Antes de anunciar, você precisa de uma oferta irresistível. Aprenda a montar a oferta certa para o público certo.',
        videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
      },
      {
        id: 'm4l3',
        n: 3,
        title: 'Como montar um anúncio básico',
        desc: 'Passo a passo para criar seu primeiro anúncio no Meta Ads focado em captação de leads imobiliários.',
        videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
      },
      {
        id: 'm4l4',
        n: 4,
        title: 'Como atender leads no WhatsApp',
        desc: 'O lead chegou — e agora? Scripts, tempos de resposta e as primeiras mensagens que convertem.',
        videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
      }
    ]
  },

  {
    id: 'm5',
    n: 5,
    title: 'Follow-up e Organização Comercial',
    desc: 'Transforme leads esquecidos em vendas. A arte do follow-up consistente e inteligente.',
    lessons: [
      {
        id: 'm5l1',
        n: 1,
        title: 'Como não perder clientes',
        desc: 'Os erros mais comuns que fazem corretores perderem vendas prontas — e como evitar cada um deles.',
        videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
      },
      {
        id: 'm5l2',
        n: 2,
        title: 'Como usar rotina de follow-up',
        desc: 'Monte uma cadência de acompanhamento que funciona sem ser inconveniente. Timing, frequência e tom.',
        videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
      },
      {
        id: 'm5l3',
        n: 3,
        title: 'Como priorizar leads quentes',
        desc: 'Identifique quais leads têm mais chance de fechar hoje e concentre sua energia onde o retorno é maior.',
        videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
      }
    ]
  },

  {
    id: 'm6',
    n: 6,
    title: 'Fechamento e Propostas',
    desc: 'Conduza o cliente até o sim com segurança, clareza e propostas que convencem.',
    lessons: [
      {
        id: 'm6l1',
        n: 1,
        title: 'Como apresentar a oportunidade',
        desc: 'A apresentação que cria desejo. Como mostrar o imóvel certo, para a pessoa certa, no momento certo.',
        videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
      },
      {
        id: 'm6l2',
        n: 2,
        title: 'Como conduzir objeções',
        desc: 'Preço, localização, prazo — aprenda a responder as objeções mais comuns sem perder o controle da negociação.',
        videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
      },
      {
        id: 'm6l3',
        n: 3,
        title: 'Como criar proposta simples',
        desc: 'Uma proposta clara vence uma complexa sempre. Modelo, estrutura e o que não pode faltar.',
        videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
      }
    ]
  },

  {
    id: 'm7',
    n: 7,
    title: 'Lives e Bônus',
    desc: 'Aulas bônus e lives gravadas com conteúdos exclusivos para turbinar seus resultados.',
    lessons: [
      {
        id: 'm7l1',
        n: 1,
        title: 'Aula bônus 1',
        desc: 'Conteúdo exclusivo extra para complementar sua jornada no Método 3Ps.',
        videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
      },
      {
        id: 'm7l2',
        n: 2,
        title: 'Aula bônus 2',
        desc: 'Mais um conteúdo especial preparado para os alunos mais dedicados da plataforma.',
        videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
      },
      {
        id: 'm7l3',
        n: 3,
        title: 'Live gravada',
        desc: 'Gravação da mentoria ao vivo com perguntas e respostas, estratégias avançadas e casos reais.',
        videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
      }
    ]
  }
];
